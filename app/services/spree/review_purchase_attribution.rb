module Spree
  class ReviewPurchaseAttribution
    Target = Struct.new(:order, :variant, keyword_init: true)

    def self.backfill_scope
      Spree::Review.where.not(customer_id: nil).where('order_id IS NULL OR variant_id IS NULL')
    end

    def initialize(review)
      @review = review
    end

    def target
      return unless attributable?

      target_order_and_variant
    end

    def call
      attribution_target = target
      return false if attribution_target.blank?

      attributes = {}
      attributes[:order] = attribution_target.order if review.order.blank?
      attributes[:variant] = attribution_target.variant if review.variant.blank? && attribution_target.variant.present?
      return false if attributes.empty?

      review.update!(attributes)
    end

    private

    attr_reader :review

    def attributable?
      review.customer_id.present? && review.product_id.present? && review.store_id.present?
    end

    def target_order_and_variant
      candidate_orders.each do |order|
        variant = target_variant_for(order)
        next if duplicate_review_exists?(order, variant)

        return Target.new(order: order, variant: variant)
      end

      nil
    end

    def candidate_orders
      orders = Spree::Order.complete.
               where(customer_id: review.customer_id, store_id: review.store_id).
               where.not(status: 'canceled').
               joins(line_items: :variant).
               merge(candidate_variant_scope).
               includes({ fulfillment_items: { return_line_items: :return } }, line_items: :variant).
               distinct.
               to_a

      orders = orders.select { |order| reviewable_purchase_for(order).reviewable? }

      orders.sort_by { |order| order_sort_key(order) }
    end

    def candidate_variant_scope
      if review.variant_id.present?
        Spree::Variant.where(id: review.variant_id)
      else
        Spree::Variant.where(product_id: review.product_id)
      end
    end

    def order_sort_key(order)
      return [1, 0, -order.id] if review.created_at.blank? || order.completed_at.blank?

      completed_after_review = order.completed_at > review.created_at ? 1 : 0
      [completed_after_review, (review.created_at - order.completed_at).abs, -order.id]
    end

    def target_variant_for(order)
      reviewable_purchase = reviewable_purchase_for(order)
      return review.variant if review.variant.present? && reviewable_purchase.reviewable_variant?(review.variant)

      reviewable_purchase.target_variant
    end

    def duplicate_review_exists?(order, variant)
      reviews = Spree::Review.
                where(store_id: review.store_id, order_id: order.id, product_id: review.product_id, customer_id: review.customer_id).
                where.not(id: review.id)

      if variant.present?
        reviews.where(variant_id: [variant.id, nil]).exists?
      else
        reviews.where(variant_id: nil).exists?
      end
    end

    def reviewable_purchase_for(order)
      Spree::ReviewablePurchase.new(order: order, product: review.product, variant: review.variant)
    end
  end
end

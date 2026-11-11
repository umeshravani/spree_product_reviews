module Spree
  class ReviewVerifiedPurchaseStatus
    attr_reader :review

    def self.refresh_scope
      Spree::Review.where.not(order_id: nil).where.not(customer_id: nil)
    end

    def self.verified_purchase?(review)
      new(review).verified_purchase?
    end

    def self.sync!(review)
      new(review).call
    end

    def self.sync_for_order!(order)
      return 0 if order.blank?

      Spree::Review.where(order_id: order.id).to_a.count do |review|
        sync!(review)
      end
    end

    def self.sync_for_order_variant!(order:, variant:)
      return 0 if order.blank? || variant.blank?

      Spree::Review.
        where(order_id: order.id, product_id: variant.product_id).
        where(variant_id: [variant.id, nil]).
        to_a.
        count { |review| sync!(review) }
    end

    def initialize(review)
      @review = review
    end

    def call
      return false unless changed?

      review.update_columns(verified_purchase: verified_purchase?, updated_at: Time.current)
      true
    end

    def changed?
      review.verified_purchase? != verified_purchase?
    end

    def verified_purchase?
      return false unless review.customer_id.present?
      return false unless review.order.present? && review.product.present?
      return false unless review.order.customer_id == review.customer_id && review.order.store_id == review.store_id

      Spree::ReviewablePurchase.new(
        order: review.order,
        product: review.product,
        variant: review.variant
      ).reviewable?
    end
  end
end

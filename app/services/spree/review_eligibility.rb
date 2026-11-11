module Spree
  class ReviewEligibility
    REASON_DISABLED = 'reviews_disabled'.freeze
    REASON_LOGIN_REQUIRED = 'login_required'.freeze
    REASON_NOT_PURCHASED = 'not_purchased'.freeze
    REASON_ALREADY_REVIEWED = 'already_reviewed'.freeze

    attr_reader :product, :store, :customer, :variant, :order

    def initialize(product:, store:, customer:, variant: nil, order: nil, settings: nil)
      @product = product
      @store = store
      @customer = customer
      @variant = variant
      @order = order
      @settings = settings
    end

    def can_review?
      reason.nil?
    end

    def reason
      return REASON_DISABLED unless store_settings[:enabled]

      unless authenticated?
        return nil if guest_reviews_allowed?

        return REASON_LOGIN_REQUIRED
      end

      return REASON_NOT_PURCHASED if !verified_purchase? && !store_settings[:allow_unverified]
      return REASON_ALREADY_REVIEWED if enforce_one_per_customer? && already_reviewed?

      nil
    end

    def verified_purchase?
      eligible_order.present?
    end

    def already_reviewed?
      existing_review.present?
    end

    def existing_review
      return if customer.blank?
      return @existing_review if defined?(@existing_review)

      review_order = order || eligible_order
      if review_order.present?
        @existing_review = existing_review_for_order(review_order)
      elsif store_settings[:allow_unverified]
        @existing_review = Spree::Review.for_store(store).for_product(product).not_discarded.
                           where(customer_id: customer.id).recent_first.first
      else
        @existing_review = nil
      end

      @existing_review
    end

    def eligible_order
      return if customer.blank?
      return @eligible_order if defined?(@eligible_order)

      @eligible_order = if order.present?
                          eligible_orders.find { |candidate| candidate.id == order.id }
                        else
                          first_unreviewed_eligible_order || eligible_orders.first
                        end
    end

    private

    def store_settings
      @store_settings ||= Spree::ReviewSetting.for_store(store)
    end

    def guest_reviews_allowed?
      store_settings[:allow_anonymous] && store_settings[:allow_unverified]
    end

    def enforce_one_per_customer?
      store_settings[:reviews_per_product_limit].to_s != 'unlimited'
    end

    def authenticated?
      customer.present?
    end

    def first_unreviewed_eligible_order
      eligible_orders.detect { |candidate| existing_review_for_order(candidate).blank? }
    end

    def existing_review_for_order(review_order)
      reviews = Spree::Review.for_store(store).for_product(product).not_discarded.where(customer_id: customer.id)
      ordered_reviews = reviews.where(order: review_order)

      target_variant = variant || reviewable_purchase_for(review_order).target_variant
      exact_review = if target_variant.present?
                       ordered_reviews.find_by(variant: target_variant) ||
                         ordered_reviews.find_by(variant_id: nil)
                     else
                       ordered_reviews.find_by(variant_id: nil)
                     end
      exact_review || legacy_existing_review_for_order(reviews, review_order, target_variant)
    end

    def legacy_existing_review_for_order(reviews, review_order, target_variant)
      legacy_reviews = reviews.where(order_id: nil)
      legacy_reviews = if target_variant.present?
                         legacy_reviews.where(variant_id: [target_variant.id, nil])
                       else
                         legacy_reviews.where(variant_id: nil)
                       end

      legacy_reviews.recent_first.detect do |legacy_review|
        legacy_review_attributed_to_order?(legacy_review, review_order, target_variant)
      end
    end

    def legacy_review_attributed_to_order?(legacy_review, review_order, target_variant)
      attribution_target = Spree::ReviewPurchaseAttribution.new(legacy_review).target
      return false if attribution_target.blank? || attribution_target.order.id != review_order.id

      target_variant.blank? ||
        attribution_target.variant.blank? ||
        attribution_target.variant.id == target_variant.id
    end

    def eligible_orders
      @eligible_orders ||= Spree::Order.complete.
        where(customer_id: customer.id, store_id: store.id).
        where.not(status: 'canceled').
        joins(line_items: :variant).
        merge(eligible_variant_scope).
        includes({ fulfillment_items: { return_line_items: :return } }, line_items: :variant).
        distinct.
        order(completed_at: :desc, id: :desc).
        to_a.
        select { |candidate| reviewable_purchase_for(candidate).reviewable? }
    end

    def eligible_variant_scope
      if variant.present?
        Spree::Variant.where(id: variant.id)
      else
        Spree::Variant.where(product_id: product.id)
      end
    end

    def reviewable_purchase_for(candidate_order)
      Spree::ReviewablePurchase.new(order: candidate_order, product: product, variant: variant)
    end
  end
end

module Spree
  module Api
    module V3
      module Store
        class ReviewEligibilitiesController < Store::BaseController
          include Spree::Api::V3::Store::ReviewProductLookup

          # GET /api/v3/store/products/:product_id/reviews/eligibility
          def show
            settings = Spree::ReviewSetting.public_hash(current_store)
            eligibility = Spree::ReviewEligibility.new(
              product: @product,
              store: current_store,
              customer: current_user,
              variant: review_variant,
              order: review_order,
              settings: settings
            )

            existing = if current_user.present? && eligibility.existing_review.present?
                         Spree::Api::V3::ReviewSerializer.new(
                           eligibility.existing_review,
                           params: serializer_params
                         ).to_h
                       end

            render json: {
              product_id: @product.prefixed_id,
              variant_id: review_variant&.prefixed_id,
              order_id: review_order&.prefixed_id,
              can_review: eligibility.can_review?,
              reason: eligibility.reason,
              verified_purchase: eligibility.verified_purchase?,
              already_reviewed: eligibility.already_reviewed?,
              review_id: eligibility.existing_review&.prefixed_id,
              existing_review: existing,
              eligible_order_id: eligibility.eligible_order&.prefixed_id,
              settings: settings
            }
          end

          private

        end
      end
    end
  end
end

module Spree
  module Api
    module V3
      module Store
        class ProductReviewSerializer
          def initialize(resource)
            @resource = resource
          end

          def serializable_hash
            if @resource.respond_to?(:each)
              @resource.map { |r| serialize_single(r) }
            else
              serialize_single(@resource)
            end
          end

          private

          def serialize_single(review)
            {
              # V3 uses human-readable prefixed IDs natively, but we'll fall back to standard IDs for custom models
              id: review.id.to_s, 
              title: review.title,
              review: review.review,
              rating: review.rating,
              approved: review.approved,
              reviewer_name: review.reviewer_name,
              is_verified_purchase: review.purchase_date.present?,
              created_at: review.created_at.iso8601,
              images: serialize_images(review)
            }
          end

          def serialize_images(review)
            return [] unless review.images.attached?
            
            review.images.map do |image|
              {
                id: image.id.to_s,
                url: Rails.application.routes.url_helpers.rails_blob_url(image, only_path: true),
                content_type: image.content_type,
                filename: image.filename.to_s
              }
            end
          end
        end
      end
    end
  end
end

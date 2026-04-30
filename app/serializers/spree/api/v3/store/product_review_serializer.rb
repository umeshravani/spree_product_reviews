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
              id: review.id.to_s,
              title: review.title,
              review: review.review,
              rating: review.rating,
              approved: review.approved,
              reviewer_name: format_reviewer_name(review), 
              is_verified_purchase: review.purchase_date.present?,
              created_at: review.created_at.iso8601,
              images: serialize_images(review)
            }
          end

          def format_reviewer_name(review)
            return "Anonymous" unless review.show_identifier && review.user
            review.user.try(:name).presence || review.user.email.split('@').first
          end

          def serialize_images(review)
            return [] unless review.images.attached?
            
            review.images.map do |image|
              
              raw_host = Spree::Store.default&.url || "thewallx.com"
              clean_host = raw_host.sub(/^https?:\/\//, '')
              protocol = clean_host.include?("localhost") ? "http://" : "https://"

              {
                id: image.id.to_s,
                url: Rails.application.routes.url_helpers.rails_blob_url(image, host: "#{protocol}#{clean_host}"),
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

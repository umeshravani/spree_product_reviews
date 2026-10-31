# frozen_string_literal: true

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
            return {} unless review

            {
              id: review.id.to_s,
              customer_id: review.customer_id&.to_s,
              title: review.title,
              review: review.review,
              rating: review.rating,
              reviewer_name: review.reviewer_name,
              is_verified_purchase: review.verified_purchaser || review.purchase_date.present?,
              purchase_date: review.purchase_date&.iso8601,
              helpful_count: review.helpful_count || 0,
              unhelpful_count: review.unhelpful_count || 0,
              created_at: review.created_at&.iso8601,
              images: serialize_images(review)
            }
          end

          def serialize_images(review)
            return [] unless review.respond_to?(:images) && review.images.attached?

            host = if Spree.respond_to?(:cdn_host) && Spree.cdn_host.present?
                     Spree.cdn_host
                   elsif defined?(Spree::Store) && Spree::Store.default&.url.present?
                     Spree::Store.default.url.sub(%r{^https?://}, '')
                   else
                     'localhost:3000'
                   end

            protocol = host.include?('localhost') ? 'http://' : 'https://'
            base_url = "#{protocol}#{host}"

            review.images.map do |image|
              url = begin
                      Rails.application.routes.url_helpers.rails_blob_url(image, host: base_url)
                    rescue StandardError
                      "/rails/active_storage/blobs/redirect/#{image.signed_id}/#{image.filename}"
                    end

              {
                id: image.id.to_s,
                url: url,
                content_type: image.content_type,
                filename: image.filename.to_s
              }
            end
          rescue StandardError => e
            Rails.logger.warn("[ProductReviewSerializer] Image serialization error: #{e.message}")
            []
          end
        end
      end
    end
  end
end

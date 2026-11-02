# frozen_string_literal: true

module Spree
  module Api
    module V3
      module Admin
        class ProductReviewsSettingsController < (defined?(::Spree::Api::V3::BaseController) ? ::Spree::Api::V3::BaseController : ActionController::API)
          skip_before_action :ensure_payload_size, raise: false
          skip_before_action :check_payload_size, raise: false

          # GET /api/v3/admin/product_reviews/settings
          def show
            config = SpreeProductReviews.config
            render json: {
              data: {
                enabled: config.enabled,
                require_approval: config.require_approval,
                review_status_default: config.review_status_default,
                allow_anonymous: config.allow_anonymous,
                allow_unverified: config.allow_unverified,
                max_images_upload: config.max_images_upload,
                max_image_size_mb: config.max_image_size_mb,
                block_spam_reviews: config.block_spam_reviews,
                disable_review_links: config.disable_review_links,
                spam_words: config.spam_words,
                customer_rate_limit_per_hour: config.customer_rate_limit_per_hour,
                ip_rate_limit_per_hour: config.ip_rate_limit_per_hour,
                report_moderation_threshold: config.report_moderation_threshold,
                reviews_per_product_limit: config.reviews_per_product_limit,
                anonymize_ips: config.anonymize_ips,
                duplicate_detection_window_hours: config.duplicate_detection_window_hours
              }
            }, status: :ok
          end

          # PATCH /api/v3/admin/product_reviews/settings
          def update
            settings = params.require(:settings).permit(
              :enabled, :require_approval, :review_status_default,
              :allow_anonymous, :allow_unverified, :max_images_upload,
              :max_image_size_mb, :block_spam_reviews, :disable_review_links,
              :spam_words, :customer_rate_limit_per_hour, :ip_rate_limit_per_hour,
              :report_moderation_threshold, :reviews_per_product_limit,
              :anonymize_ips, :duplicate_detection_window_hours
            )

            settings.each do |key, value|
              setter = "#{key}="
              if SpreeProductReviews.config.respond_to?(setter)
                # Type cast boolean/integer
                casted_val = case value
                             when 'true', true then true
                             when 'false', false then false
                             when /^\d+$/ then value.to_i
                             else value
                             end
                SpreeProductReviews.config.send(setter, casted_val)
              end
            end

            show
          end
        end
      end
    end
  end
end


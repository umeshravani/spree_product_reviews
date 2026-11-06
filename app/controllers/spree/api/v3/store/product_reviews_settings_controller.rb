# frozen_string_literal: true

module Spree
  module Api
    module V3
      module Store
        class ProductReviewsSettingsController < (defined?(::Spree::Api::V3::BaseController) ? ::Spree::Api::V3::BaseController : ActionController::API)
          skip_before_action :ensure_payload_size, raise: false
          skip_before_action :check_payload_size, raise: false

          # GET /api/v3/store/product_reviews/settings
          def show
            config = SpreeProductReviews.config
            render json: {
              data: {
                enabled: config.enabled,
                require_approval: config.require_approval,
                allow_anonymous: config.allow_anonymous,
                allow_unverified: config.allow_unverified,
                max_images_upload: config.max_images_upload,
                max_image_size_mb: config.max_image_size_mb,
                modal_mode: config.modal_mode || 'multi',
                rewards_enabled: config.rewards_enabled,
                photo_reward_enabled: config.photo_reward_enabled,
                photo_reward_percentage: config.photo_reward_percentage,
                photo_reward_amount: config.photo_reward_amount,
                photo_reward_promotion_id: config.photo_reward_promotion_id,
                photo_reward_text: config.photo_reward_text,
                video_reward_enabled: config.video_reward_enabled,
                video_reward_percentage: config.video_reward_percentage,
                video_reward_amount: config.video_reward_amount,
                video_reward_promotion_id: config.video_reward_promotion_id,
                video_reward_text: config.video_reward_text,
                step1_title: config.step1_title,
                step1_dislike_label: config.step1_dislike_label,
                step1_love_label: config.step1_love_label,
                step2_title: config.step2_title,
                step2_subtitle: config.step2_subtitle,
                step3_title: config.step3_title,
                step3_placeholder: config.step3_placeholder,
                step4_title: config.step4_title,
                step4_subtitle: config.step4_subtitle,
                single_form_title: config.single_form_title,
                single_form_description: config.single_form_description,
                title_star_color: config.title_star_color,
                bottom_star_color: config.bottom_star_color,
                title_rating_format: config.title_rating_format,
                title_reviews_label: config.title_reviews_label
              }
            }, status: :ok
          end
        end
      end
    end
  end
end

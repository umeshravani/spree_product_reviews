module Spree
  module Api
    module V3
      module Admin
        class ReviewSettingsController < BaseController
          scoped_resource :reviews

          # GET /api/v3/admin/reviews/settings
          def show
            authorize! :read, Spree::ReviewSetting
            render json: {
              data: Spree::ReviewSetting.admin_hash(current_store)
            }, status: :ok
          end

          # PATCH/PUT /api/v3/admin/reviews/settings
          def update
            authorize! :update, Spree::ReviewSetting
            updated = Spree::ReviewSetting.update_for_store!(current_store, permitted_settings)
            render json: { data: updated }, status: :ok
          end

          private

          def permitted_settings
            source = params[:settings].presence || params[:review_settings].presence || params
            allowed_keys = Spree::ReviewSetting::ALL_KEYS + %i[
              auto_approve_reviews
              max_images_upload
              max_image_size_mb
              max_video_size_mb
            ]
            source.permit(*allowed_keys)
          end
        end
      end
    end
  end
end


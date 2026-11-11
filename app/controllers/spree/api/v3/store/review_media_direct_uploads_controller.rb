module Spree
  module Api
    module V3
      module Store
        class ReviewMediaDirectUploadsController < Store::BaseController
          # POST /api/v3/store/review_media/direct_uploads
          def create
            return render_invalid_content_type unless allowed_content_type?
            return render_invalid_byte_size unless allowed_byte_size?

            blob = ActiveStorage::Blob.create_before_direct_upload!(
              **blob_params,
              service_name: Spree.public_storage_service_name
            )

            render json: {
              direct_upload: {
                url: blob.service_url_for_direct_upload,
                headers: blob.service_headers_for_direct_upload
              },
              signed_id: blob.signed_id,
              media_type: video_upload? ? 'video' : 'image'
            }, status: :created
          end

          private

          def store_settings
            @store_settings ||= Spree::ReviewSetting.for_store(current_store)
          end

          def blob_params
            @blob_params ||= params.require(:blob).permit(:filename, :byte_size, :checksum, :content_type).to_h.symbolize_keys
          end

          def content_type
            blob_params[:content_type].to_s.downcase
          end

          def video_upload?
            Spree::ReviewMedia::VIDEO_CONTENT_TYPES.include?(content_type)
          end

          def image_upload?
            Spree::ReviewMedia::IMAGE_CONTENT_TYPES.include?(content_type)
          end

          def allowed_content_type?
            image_upload? || (store_settings[:allow_videos] && video_upload?)
          end

          def max_limit_megabytes
            if video_upload?
              store_settings[:max_video_size_megabytes].to_i
            else
              store_settings[:max_image_size_megabytes].to_i
            end
          end

          def allowed_byte_size?
            max_size = max_limit_megabytes.megabytes
            return true if max_size <= 0

            blob_params[:byte_size].to_i <= max_size
          end

          def render_invalid_content_type
            allowed_label = store_settings[:allow_videos] ? 'an image or video (JPEG, PNG, WebP, MP4, MOV, WebM).' : 'an image.'
            render_error(
              code: Spree::Api::V3::ErrorHandler::ERROR_CODES[:parameter_invalid],
              message: "Review media must be #{allowed_label}",
              status: :bad_request
            )
          end

          def render_invalid_byte_size
            render_error(
              code: Spree::Api::V3::ErrorHandler::ERROR_CODES[:request_too_large],
              message: "Review media must be smaller than #{max_limit_megabytes} MB.",
              status: :content_too_large
            )
          end
        end
      end
    end
  end
end

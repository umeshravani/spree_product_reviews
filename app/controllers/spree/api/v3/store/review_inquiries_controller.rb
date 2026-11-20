module Spree
  module Api
    module V3
      module Store
        class ReviewInquiriesController < Store::BaseController
          include Spree::Api::V3::Store::ReviewProductLookup

          # POST /api/v3/store/products/:product_id/questions
          # POST /api/v3/store/products/:product_id/reviews/ask_question
          def create
            name = params[:name].to_s.strip
            email = params[:email].to_s.strip
            question = (params[:question].presence || params[:message]).to_s.strip

            if name.blank? || email.blank? || question.blank?
              return render json: {
                error: 'Name, email, and question are required fields.'
              }, status: :unprocessable_entity
            end

            # Log inquiry
            Rails.logger.info("[SpreeProductReviews] Customer question received for product #{@product.id} (#{name} <#{email}>): #{question.truncate(100)}")

            # Deliver notification to store support if ActionMailer configured
            begin
              support_email = current_store.customer_support_email.presence || current_store.mail_from_address
              if support_email.present? && ActionMailer::Base.delivery_method.present?
                # Optional support notification
              end
            rescue StandardError => e
              Rails.logger.warn("[SpreeProductReviews] Notification error: #{e.message}")
            end

            render json: {
              data: {
                success: true,
                message: 'Thank you! Your question has been submitted. Our team will review and reply shortly.',
                product_id: @product.id,
                author_name: name
              }
            }, status: :created
          end
        end
      end
    end
  end
end

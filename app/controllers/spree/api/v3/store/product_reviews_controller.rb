module Spree
  module Api
    module V3
      module Store
        class ProductReviewsController < ::Spree::Api::V3::BaseController
          before_action :load_product

          def index
            user = fallback_user
            
            if user
              reviews = @product.product_reviews
                                .where("approved = ? OR user_id = ?", true, user.id)
                                .order(created_at: :desc)
            else
              reviews = @product.product_reviews
                                .approved
                                .order(created_at: :desc)
            end
            
            render json: {
              data: ProductReviewSerializer.new(reviews).serializable_hash,
              meta: { total_count: reviews.count }
            }, status: :ok
          end

          def create
            # Use our new authentication fallback
            user = fallback_user
            return render json: { error: 'You must be logged in to leave a review.' }, status: :unauthorized unless user

            @review = @product.product_reviews.build(review_params)
            @review.user = user
            @review.locale = I18n.locale.to_s
            @review.ip_address = request.remote_ip
            @review.purchase_date = user.recent_purchase_date_for(@product)

            default_status = (current_store.preferred_review_status_default rescue 'pending')
            should_approve = (default_status == 'approved')
            spam_detected = false

            if (current_store.preferred_disable_review_links rescue false) && @review.review.match?(%r{https?://|www\.|[a-zA-Z0-9]+\.(com|net|org|info|biz)})
              should_approve = false; spam_detected = true
            end

            if (current_store.preferred_block_spam_reviews rescue false) && @review.review.present?
              custom_words = (current_store.preferred_spam_words || "").split(',').map(&:strip).reject(&:empty?)
              full_text = "#{@review.title} #{@review.review}".downcase
              if custom_words.any? { |word| full_text.include?(word.downcase) }
                should_approve = false; spam_detected = true
              end
            end

            @review.approved = should_approve
            @review.spam = spam_detected

            if @review.save
              render json: ProductReviewSerializer.new(@review).serializable_hash, status: :created
            else
              render json: { error: @review.errors.full_messages.join(', ') }, status: :unprocessable_entity
            end
          end

          private

          def load_product
            @product = Spree::Product.friendly.find(params[:product_id])
          end

          def review_params
            params.require(:product_review).permit(:rating, :title, :review, :show_identifier, images: [])
          end

          def fallback_user
            begin
              return current_user if current_user

              # 1. Grab our injected custom header from Next.js
              token = request.headers['X-Spree-Token']
              return nil if token.blank?

              # 2. Decode it just in case Next.js URL-encoded it
              require 'cgi'
              clean_token = CGI.unescape(token)

              # 3. Query Doorkeeper (Safely handles hashed tokens in Spree 5.4+)
              access_token = nil
              if Doorkeeper::AccessToken.respond_to?(:by_refresh_token)
                access_token = Doorkeeper::AccessToken.by_refresh_token(clean_token) || Doorkeeper::AccessToken.by_token(clean_token)
              else
                access_token = Doorkeeper::AccessToken.find_by(refresh_token: clean_token) || Doorkeeper::AccessToken.find_by(token: clean_token)
              end

              # 4. Return the actual user!
              return Spree.user_class.find_by(id: access_token.resource_owner_id) if access_token

              nil
            rescue => e
              Rails.logger.error "--- ProductReviews Auth Error: #{e.message} ---"
              nil
            end
          end
        end
      end
    end
  end
end

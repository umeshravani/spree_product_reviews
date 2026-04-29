module Spree
  module Api
    module V3
      module Store
        class ProductReviewsController < ::Spree::Api::V3::BaseController
          before_action :load_product

          def index
            user = fallback_user
            
            # Direct SQL to avoid the ActiveRecord .or() 500 crash
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

          # --- THE UNBREAKABLE AUTH BRIDGE ---
          def fallback_user
            return current_user if current_user

            # 1. Grab token from custom header or standard Authorization header
            token = request.headers['HTTP_X_SPREE_TOKEN'] || request.headers['X-Spree-Token']
            token ||= request.headers['Authorization']&.split(' ')&.last

            if token.blank?
              Rails.logger.error "--- [REVIEWS API] No Auth Token provided by Next.js ---"
              return nil
            end

            require 'cgi'
            require 'digest'
            
            # 2. Clean the token and create a SHA-256 hash counterpart
            clean_token = CGI.unescape(token).strip.delete('"').delete("'")
            hashed_token = Digest::SHA256.hexdigest(clean_token)

            Rails.logger.info "--- [REVIEWS API] Checking Token: #{clean_token[0..15]}... ---"

            begin
              access_token = nil
              
              # Strategy A: Native Doorkeeper Methods (Spree 5.4)
              access_token = Spree::OauthAccessToken.by_token(clean_token) if Spree::OauthAccessToken.respond_to?(:by_token)
              access_token ||= Spree::OauthAccessToken.by_refresh_token(clean_token) if Spree::OauthAccessToken.respond_to?(:by_refresh_token)

              # Strategy B: Hashed Lookups
              access_token ||= Spree::OauthAccessToken.find_by(token: hashed_token)
              access_token ||= Spree::OauthAccessToken.find_by(refresh_token: hashed_token)

              # Strategy C: Plaintext Lookups
              access_token ||= Spree::OauthAccessToken.find_by(token: clean_token)
              access_token ||= Spree::OauthAccessToken.find_by(refresh_token: clean_token)

              # Evaluate OAuth Token
              if access_token
                user = Spree.user_class.find_by(id: access_token.resource_owner_id)
                Rails.logger.info "--- [REVIEWS API] SUCCESS via OAuth! Logged in as User ID: #{user&.id} ---"
                return user
              end

              # Strategy D: Guest/Order Cart Fallback
              # If Next.js sent an active Cart Token instead of an OAuth token, we find the user who owns the cart!
              order = Spree::Order.find_by(token: clean_token) || Spree::Order.find_by(number: clean_token)
              if order && order.user
                Rails.logger.info "--- [REVIEWS API] SUCCESS via Order Cart! Logged in as User ID: #{order.user.id} ---"
                return order.user
              end

              Rails.logger.error "--- [REVIEWS API] FAILED! Token not found in Database or Active Orders ---"
              
              # Failsafe Debugging: Print exactly what format the database is storing
              latest = Spree::OauthAccessToken.last
              if latest
                Rails.logger.error "--- [DEBUG] DB Latest Token: #{latest.token} | Refresh: #{latest.refresh_token} ---"
              end
              
              return nil
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

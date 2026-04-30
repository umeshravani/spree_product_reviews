module Spree
  module Api
    module V3
      module Store
        class ProductReviewsController < ::Spree::Api::V3::BaseController
          skip_before_action :ensure_payload_size, raise: false
          skip_before_action :check_payload_size, raise: false
          def ensure_payload_size; end
          def ensure_payload_size!; end

          before_action :load_product

          def index
            user = fallback_user
            reviews = reviews_for_user_scope(user)
            render json: {
              data: ProductReviewSerializer.new(reviews).serializable_hash,
              meta: { total_count: reviews.count }
            }, status: :ok
          end

          def create
            user = fallback_user

            unless user
              Rails.logger.error "--- [REVIEWS API] 401: Token could not be mapped to any active User."
              return render_unauthorized
            end

            @review = build_review_for(user)

            apply_admin_review_settings(@review, user)

            @review.product_name = @product.name if @review.respond_to?(:product_name=)

            if @review.save
              render json: ProductReviewSerializer.new(@review).serializable_hash, status: :created
            else
              Rails.logger.error "--- [REVIEWS API] Validation Failed: #{@review.errors.full_messages}"
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

          def reviews_for_user_scope(user)
            base_scope = Spree::ProductReview.where(product_id: @product.id)
            if user
              base_scope.where("approved = ? OR user_id = ?", true, user.id).order(created_at: :desc)
            else
              base_scope.where(approved: true).order(created_at: :desc)
            end
          end

          def build_review_for(user)
            @product.product_reviews.build(review_params).tap do |review|
              review.user = user
              review.locale = I18n.locale.to_s
              review.ip_address = request.remote_ip
              review.purchase_date = user.respond_to?(:recent_purchase_date_for) ? user.recent_purchase_date_for(@product) : nil
            end
          end

          def apply_admin_review_settings(review, user)
            default_status = (current_store.preferred_review_status_default rescue 'pending')
            should_approve = (default_status == 'approved')
            spam_detected = false

            if disable_review_links? && review.review&.match?(review_links_regex)
              should_approve = false
              spam_detected = true
            end

            if block_spam_reviews? && review.review.present? 
              custom_words = spam_words_list
              full_text = [review.title, review.review].join(" ").downcase
              if custom_words.any? { |word| full_text.include?(word.downcase) }
                should_approve = false
                spam_detected = true
              end
            end

            review.approved = should_approve
            review.spam = spam_detected
          end

          def disable_review_links?
            current_store.preferred_disable_review_links rescue false
          end

          def review_links_regex
            %r{https?://|www\.|[a-zA-Z0-9]+\.(com|net|org|info|biz)}
          end

          def block_spam_reviews?
            current_store.preferred_block_spam_reviews rescue false
          end

          def spam_words_list
            (current_store.preferred_spam_words || "").split(',').map(&:strip).reject(&:empty?)
          end

          def render_unauthorized
            render json: { error: 'Your session has expired or is invalid. Please log out and log back in.' }, status: :unauthorized
          end

          def fallback_user
            user = try_spree_current_user
            return user if user

            token = extract_auth_token
            return nil if token.blank?

            clean_token = token.to_s.strip.delete('"').delete("'")
            Rails.logger.info "--- [REVIEWS API] Scanning Database for Token: #{clean_token[0..15]}... ---"

            user_from_jwt(clean_token) ||
              user_from_doorkeeper(clean_token) ||
              user_from_legacy_api_key(clean_token) ||
              user_from_cart_token(clean_token)
          rescue => e
            Rails.logger.error "--- [REVIEWS API] Fatal Auth Bridge Error: #{e.message} ---"
            Rails.logger.error "--- [REVIEWS API] 401 Unauthorized - The provided token is dead and does not exist in the database. ---"
            nil
          end

          def try_spree_current_user
            spree_current_user if respond_to?(:spree_current_user) && spree_current_user
          rescue => e
            Rails.logger.warn "--- [REVIEWS API] Native auth skipped: #{e.message} ---"
            nil
          end

          def extract_auth_token
            request.headers['Authorization']&.split(' ')&.last || request.headers['HTTP_X_SPREE_TOKEN']
          end

          def user_from_jwt(token)
            return nil unless token.split('.').length == 3
            require 'jwt'
            decoded_payload = JWT.decode(token, nil, false).first

            user_id = decoded_payload['user_id'] || decoded_payload['sub'] || decoded_payload['resource_owner_id'] || decoded_payload['spree_user_id']
            return nil unless user_id

            user = Spree.user_class.find_by(id: user_id)
            Rails.logger.info "--- [REVIEWS API] SUCCESS via JWT! User: #{user&.email} ---"
            user
          rescue => e
            Rails.logger.error "--- [REVIEWS API] JWT Decode Error: #{e.message} ---"
            nil
          end

          def user_from_doorkeeper(token)
            require 'digest'
            hashed_token = Digest::SHA256.hexdigest(token)
            token_class = if defined?(Spree::OauthAccessToken)
                            Spree::OauthAccessToken
                          elsif defined?(Doorkeeper::AccessToken)
                            Doorkeeper::AccessToken
                          end
            return nil unless token_class
            access_token = token_class.find_by(token: hashed_token) || token_class.find_by(token: token)
            return nil unless access_token
            user = Spree.user_class.find_by(id: access_token.resource_owner_id)
            Rails.logger.info "--- [REVIEWS API] SUCCESS via OAuth DB! User: #{user&.email} ---"
            user
          rescue
            nil
          end

          def user_from_legacy_api_key(token)
            return nil unless Spree.user_class.column_names.include?('spree_api_key')
            user = Spree.user_class.find_by(spree_api_key: token)
            if user
              Rails.logger.info "--- [REVIEWS API] SUCCESS via Legacy API Key! User: #{user.email} ---"
            end
            user
          end

          def user_from_cart_token(token)
            order = Spree::Order.find_by(token: token) || Spree::Order.find_by(number: token)
            if order&.user
              Rails.logger.info "--- [REVIEWS API] SUCCESS via Active Cart! User: #{order.user.email} ---"
              order.user
            end
          end
        end
      end
    end
  end
end

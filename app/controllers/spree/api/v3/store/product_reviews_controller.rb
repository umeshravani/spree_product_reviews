# frozen_string_literal: true

module Spree
  module Api
    module V3
      module Store
        class ProductReviewsController < (defined?(::Spree::Api::V3::BaseController) ? ::Spree::Api::V3::BaseController : ActionController::API)
          skip_before_action :ensure_payload_size, raise: false
          skip_before_action :check_payload_size, raise: false

          before_action :load_product, only: [:index, :create, :update, :destroy]
          before_action :load_review, only: [:vote]

          # GET /api/v3/store/products/:product_id/product_reviews
          def index
            customer = resolve_current_customer
            base_scope = if customer
                           @product.reviews.where('approved = ? OR customer_id = ?', true, customer.id)
                         else
                           @product.reviews.approved
                         end

            if params[:rating].present?
              base_scope = base_scope.where(rating: params[:rating].to_i)
            end

            case params[:sort]
            when 'highest_rating'
              base_scope = base_scope.highest_rating
            when 'lowest_rating'
              base_scope = base_scope.lowest_rating
            when 'most_helpful'
              base_scope = base_scope.most_helpful
            else
              base_scope = base_scope.newest
            end

            page = [params[:page].to_i, 1].max
            per_page = [[(params[:per_page] || 10).to_i, 1].max, 50].min
            total_count = base_scope.count
            reviews = base_scope.offset((page - 1) * per_page).limit(per_page)

            # Rating breakdown
            distribution = (1..5).each_with_object({}) do |star, acc|
              acc[star] = @product.reviews.approved.where(rating: star).count
            end

            render json: {
              data: ProductReviewSerializer.new(reviews).serializable_hash,
              meta: {
                total_count: total_count,
                page: page,
                per_page: per_page,
                average_rating: @product.respond_to?(:average_rating) ? @product.average_rating.to_f : 0.0,
                review_count: @product.respond_to?(:review_count) ? @product.review_count : 0,
                rating_distribution: distribution
              }
            }, status: :ok
          end

          # POST /api/v3/store/products/:product_id/product_reviews
          def create
            unless reviews_globally_enabled?
              return render json: {
                error: 'reviews_disabled',
                message: 'Product reviews are currently disabled.'
              }, status: :unprocessable_entity
            end

            if @product.respond_to?(:reviews_allowed?) && !@product.reviews_allowed?
              return render json: {
                error: 'product_reviews_disabled',
                message: 'Reviews are not permitted for this product.'
              }, status: :unprocessable_entity
            end

            customer = resolve_current_customer
            unless customer || allow_anonymous_reviews?
              return render json: {
                error: 'unauthorized',
                message: 'Authentication required to post a review.'
              }, status: :unauthorized
            end

            @review = @product.reviews.build(review_params)
            @review.customer = customer if customer
            @review.locale = I18n.locale.to_s
            @review.ip_address = request.remote_ip
            @review.product_name = @product.name

            apply_moderation_rules(@review)

            if @review.save
              render json: {
                data: ProductReviewSerializer.new(@review).serializable_hash,
                meta: {
                  message: @review.approved? ? 'Review published successfully.' : 'Review submitted and pending moderation.'
                }
              }, status: :created
            else
              render json: {
                error: 'validation_failed',
                errors: @review.errors.full_messages
              }, status: :unprocessable_entity
            end
          end

          # PATCH /api/v3/store/products/:product_id/product_reviews/:id
          def update
            customer = resolve_current_customer
            unless customer
              return render json: { error: 'unauthorized', message: 'Authentication required.' }, status: :unauthorized
            end

            @review = @product.reviews.not_discarded.find(params[:id])
            unless @review.customer_id == customer.id || (customer.respond_to?(:user_id) && @review.user_id == customer.user_id)
              return render json: { error: 'forbidden', message: 'You can only edit your own reviews.' }, status: :forbidden
            end

            @review.assign_attributes(review_params)
            apply_moderation_rules(@review)

            if @review.save
              @review.record_audit!(action: :edit, moderator: customer, note: 'Updated by reviewer')
              render json: {
                data: ProductReviewSerializer.new(@review).serializable_hash,
                meta: {
                  message: @review.approved? ? 'Review updated successfully.' : 'Review updated and pending moderation.'
                }
              }, status: :ok
            else
              render json: { error: 'validation_failed', errors: @review.errors.full_messages }, status: :unprocessable_entity
            end
          end

          # DELETE /api/v3/store/products/:product_id/product_reviews/:id
          def destroy
            customer = resolve_current_customer
            unless customer
              return render json: { error: 'unauthorized', message: 'Authentication required.' }, status: :unauthorized
            end

            @review = @product.reviews.not_discarded.find(params[:id])
            unless @review.customer_id == customer.id || (customer.respond_to?(:user_id) && @review.user_id == customer.user_id)
              return render json: { error: 'forbidden', message: 'You can only withdraw your own reviews.' }, status: :forbidden
            end

            @review.discard!(moderator: customer, note: 'Withdrawn by customer')
            head :no_content
          end

          # POST /api/v3/store/product_reviews/:id/vote
          def vote
            customer = resolve_current_customer
            helpful = params[:helpful].to_s == 'true' || params[:helpful] == true

            begin
              @review.vote!(
                helpful: helpful,
                customer_id: customer&.id,
                ip_address: request.remote_ip
              )
              render json: {
                data: ProductReviewSerializer.new(@review.reload).serializable_hash,
                meta: { message: 'Vote recorded successfully.' }
              }, status: :ok
            rescue ActiveRecord::RecordInvalid => e
              render json: {
                error: 'duplicate_vote',
                message: e.message
              }, status: :unprocessable_entity
            end
          end

          private

          def load_product
            scope = if respond_to?(:current_store) && current_store
                      current_store.products
                    else
                      Spree::Product
                    end
            raw_id = params[:product_id].to_s
            if defined?(::Spree::PrefixedId) && ::Spree::PrefixedId.prefixed_id?(raw_id)
              decoded = ::Spree::PrefixedId.decode_prefixed_id(raw_id)
              @product = scope.find_by(id: decoded) || scope.friendly.find(raw_id)
            else
              @product = scope.friendly.find(raw_id)
            end
          end

          def load_review
            raw_id = params[:id].to_s
            if defined?(::Spree::PrefixedId) && ::Spree::PrefixedId.prefixed_id?(raw_id)
              decoded = ::Spree::PrefixedId.decode_prefixed_id(raw_id)
              @review = Spree::ProductReview.find_by(id: decoded) || Spree::ProductReview.find(raw_id)
            else
              @review = Spree::ProductReview.find(raw_id)
            end
          end

          def review_params
            params.require(:product_review).permit(:rating, :title, :review, :name, :show_identifier, images: [])
          end

          def reviews_globally_enabled?
            if SpreeProductReviews.config.respond_to?(:enabled)
              SpreeProductReviews.config.enabled
            else
              true
            end
          end

          def allow_anonymous_reviews?
            if SpreeProductReviews.config.respond_to?(:allow_anonymous)
              SpreeProductReviews.config.allow_anonymous
            else
              false
            end
          end

          def apply_moderation_rules(review)
            require_approval = begin
                                 SpreeProductReviews.config.require_approval
                               rescue StandardError
                                 true
                               end
            should_approve = !require_approval
            is_spam = false

            # Spam link detection
            disable_links = begin
                              SpreeProductReviews.config.disable_review_links
                            rescue StandardError
                              true
                            end

            if disable_links
              if review.review.to_s.match?(%r{https?://|www\.|[a-zA-Z0-9-]+\.(com|net|org|io|xyz|biz)}i)
                should_approve = false
                is_spam = true
              end
            end

            # Spam words detection
            spam_words_str = begin
                               SpreeProductReviews.config.spam_words
                             rescue StandardError
                               ''
                             end
            if spam_words_str.present?
              words = spam_words_str.split(',').map(&:strip).reject(&:empty?)
              full_text = "#{review.title} #{review.review}".downcase
              if words.any? { |w| full_text.include?(w.downcase) }
                should_approve = false
                is_spam = true
              end
            end

            review.approved = should_approve
            review.spam = is_spam
          end

          def resolve_current_customer
            if respond_to?(:spree_current_customer) && spree_current_customer
              return spree_current_customer
            end

            if respond_to?(:spree_current_user) && spree_current_user
              return spree_current_user
            end

            # Extract Bearer token / JWT
            auth_header = request.headers['Authorization'] || request.headers['HTTP_X_SPREE_TOKEN']
            return nil if auth_header.blank?

            token = auth_header.to_s.split(' ').last.delete('"').delete("'")
            return nil if token.blank?

            # Decode JWT
            if token.count('.') == 2
              require 'jwt'
              decoded = JWT.decode(token, nil, false).first
              customer_id = decoded['customer_id'] || decoded['sub'] || decoded['user_id']
              if customer_id && defined?(Spree.customer_class) && Spree.customer_class.present?
                return Spree.customer_class.to_s.safe_constantize&.find_by(id: customer_id)
              end
            end

            nil
          rescue StandardError => e
            Rails.logger.warn("[ProductReviewsController] Auth resolution error: #{e.message}")
            nil
          end
        end
      end
    end
  end
end

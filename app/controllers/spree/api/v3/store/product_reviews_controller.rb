module Spree
  module Api
    module V3
      module Store
        class ProductReviewsController < ::Spree::Api::V3::BaseController
          before_action :load_product

          def index
            # Fetch approved reviews
            scope = @product.product_reviews.approved
            
            # FIX: Check for cookie user (Next.js proxy) OR token user (SDK)
            user = spree_current_user || current_user
            
            # If user is logged in, also show their own pending reviews
            if user
              user_scope = @product.product_reviews.where(user: user)
              scope = scope.or(user_scope)
            end

            reviews = scope.order(created_at: :desc)
            
            # V3 standard: { data: [...], meta: {...} }
            render json: {
              data: ProductReviewSerializer.new(reviews).serializable_hash,
              meta: { total_count: reviews.count }
            }, status: :ok
          end

          def create
            # FIX: Require cookie user OR token user
            user = spree_current_user || current_user
            return render json: { error: 'You must be logged in to leave a review.' }, status: :unauthorized unless user

            @review = @product.product_reviews.build(review_params)
            @review.user = user
            @review.locale = I18n.locale.to_s
            @review.ip_address = request.remote_ip
            @review.purchase_date = user.recent_purchase_date_for(@product)

            # Spam Detection Logic
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
              # V3 standard response for singular creation
              render json: ProductReviewSerializer.new(@review).serializable_hash, status: :created
            else
              render json: { error: @review.errors.full_messages.join(', ') }, status: :unprocessable_entity
            end
          end

          private

          def load_product
            # Support both integer IDs and Slugs
            @product = Spree::Product.friendly.find(params[:product_id])
          end

          def review_params
            params.require(:product_review).permit(:rating, :title, :review, :show_identifier, images: [])
          end
        end
      end
    end
  end
end

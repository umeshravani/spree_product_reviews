module Spree
    module Admin
      class ReviewsController < ResourceController
        # We map this controller to the Spree::ProductReview model
        def model_class
          Spree::ProductReview
        end
  
        def index
          # Eager load product and user to prevent N+1 queries
          @product_reviews = Spree::ProductReview.accessible_by(current_ability)
                                                 .includes(:product, :user, images_attachments: :blob)
                                                 .order(created_at: :desc)
                                                 .page(params[:page])
        end
      end
    end
  end

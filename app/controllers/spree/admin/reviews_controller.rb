module Spree
  module Admin
    class ReviewsController < ResourceController
      # Compatibility: Include Pagy for Spree 5.3+
      include Pagy::Backend if defined?(Pagy::Backend)

      def model_class
        Spree::ProductReview
      end

      # Force the instance variable to be @product_review (instead of @review)
      def object_name
        'product_review'
      end

      def index
        params[:q] ||= {}
        @search = model_class.ransack(params[:q])
        
        # Eager load for performance
        scope = @search.result.includes(:product, :user, images_attachments: :blob)
                              .order(created_at: :desc)

        # Hybrid Pagination Logic (Pagy vs Kaminari)
        if defined?(Pagy) && respond_to?(:pagy)
          # Spree 5.3+ (Pagy)
          @pagy, @collection = pagy(scope)
        elsif scope.respond_to?(:page)
          # Older Spree (Kaminari)
          per_page = params[:per_page] || 10
          @collection = scope.page(params[:page]).per(per_page)
        else
          @collection = scope
        end
        
        @product_reviews = @collection
      end

      def approve
        @product_review = Spree::ProductReview.find(params[:id])
        @product_review.update_attribute(:approved, true)
        flash[:success] = Spree.t(:info_approve_review)
        redirect_back(fallback_location: admin_reviews_path)
      end

      def disapprove
        @product_review = Spree::ProductReview.find(params[:id])
        @product_review.update_attribute(:approved, false)
        flash[:success] = Spree.t(:info_disapprove_review)
        redirect_back(fallback_location: admin_reviews_path)
      end
      
      def bulk_approve
        if params[:ids].present?
          Spree::ProductReview.where(id: params[:ids]).update_all(approved: true)
          flash[:success] = Spree.t(:review_approved)
        end
        redirect_back(fallback_location: admin_reviews_path)
      end

      def bulk_disapprove
        if params[:ids].present?
          Spree::ProductReview.where(id: params[:ids]).update_all(approved: false)
          flash[:success] = Spree.t(:review_disapproved)
        end
        redirect_back(fallback_location: admin_reviews_path)
      end

      def bulk_destroy
        if params[:ids].present?
          Spree::ProductReview.where(id: params[:ids]).destroy_all
          flash[:success] = Spree.t(:review_deleted)
        end
        redirect_back(fallback_location: admin_reviews_path)
      end

      private

      def permitted_resource_params
        params.require(:product_review).permit(:title, :review, :rating, :approved)
      end

      # URL OVERRIDES (To Fix"No route matches" errors)
      protected

      def collection_url(options = {})
        admin_reviews_url(options)
      end

      def object_url(object = nil, options = {})
        target = object ? object : @object
        admin_review_url(target, options)
      end

      def edit_object_url(object, options = {})
        edit_admin_review_url(object, options)
      end
    end
  end
end

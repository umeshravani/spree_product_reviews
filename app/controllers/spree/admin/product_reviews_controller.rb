module Spree
  module Admin
    class ProductReviewsController < ResourceController
      belongs_to "spree/product", find_by: :slug

      before_action :find_product_review, only: [:approve, :edit, :update, :destroy]

      def index
        # You can add filtering logic or sorting here if needed
      end

      def update
        if @product_review.update(permitted_resource_params)
          flash[:success] = Spree.t('product_review.flash_messages.update.success')
          respond_to do |format|
            format.turbo_stream { render turbo_stream: turbo_stream.replace("dialog_modal_lg", "") }
            format.html { redirect_to admin_product_product_reviews_path(@product) }
          end
        else
          render :edit
        end
      end

      def approve
        @product_review.update(approved: true)
        flash[:success] = Spree.t(:review_approved)
        redirect_to admin_product_product_reviews_path(@product_review.product)
      end

      def disapprove
        @product_review.update(approved: false)
        flash[:success] = Spree.t(:review_disapproved)
        redirect_to admin_product_product_reviews_path(@product_review.product)
      end

      private

      def permitted_resource_params
        params.require(:product_review).permit(:title, :rating, :review)
      end

      def find_product_review
        @product_review = Spree::ProductReview.find(params[:id])
      end
    end
  end
end

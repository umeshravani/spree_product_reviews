module Spree
  module Admin
    class ProductReviewsController < ResourceController
      belongs_to "spree/product", find_by: :slug

      before_action :find_product_review, only: [:approve, :edit, :update, :destroy, :attach_image, :purge_images]

      def index
        # optionally add filtering/sorting
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

      # --- Attach a single image ---
      def attach_image
        if params[:file].present?
          @product_review.images.attach(params[:file])
        end
        head :ok
      end

      # DELETE /admin/products/:product_id/product_reviews/:id/purge_images
      def purge_images
        ids = params[:ids] || []
        @product_review.images.where(id: ids).each(&:purge_later)

        respond_to do |format|
          format.json { head :ok }
          format.html { redirect_back fallback_location: edit_admin_product_product_review_path(@product, @product_review) }
        end
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

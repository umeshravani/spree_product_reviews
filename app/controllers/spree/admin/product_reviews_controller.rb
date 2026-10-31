# frozen_string_literal: true

module Spree
  module Admin
    parent_class = if defined?(Spree::Admin::ResourceController)
                     Spree::Admin::ResourceController
                   elsif defined?(ResourceController)
                     ResourceController
                   else
                     ActionController::Base
                   end

    class ProductReviewsController < parent_class
      if respond_to?(:belongs_to)
        belongs_to "spree/product", find_by: :slug
      end

      before_action :find_product_review, only: [:approve, :edit, :update, :destroy, :attach_image, :purge_images], if: -> { respond_to?(:find_product_review) }

      def index; end

      def update
        if @product_review.update(permitted_resource_params)
          flash[:success] = Spree.t('product_review.flash_messages.update.success')
          respond_to do |format|
            format.turbo_stream { render turbo_stream: turbo_stream.replace("dialog_modal_lg", "") } if defined?(turbo_stream)
            format.html { redirect_to admin_product_product_reviews_path(@product) }
          end
        else
          render :edit
        end
      end

      def approve
        @product_review.update(approved: true)
        flash[:success] = Spree.t('product_review.flash_messages.create.approved')
        redirect_to admin_product_product_reviews_path(@product)
      end

      def disapprove
        @product_review.update(approved: false)
        flash[:success] = Spree.t('product_review.flash_messages.create.disapproved')
        redirect_to admin_product_product_reviews_path(@product)
      end

      def destroy
        @product_review.destroy
        flash[:success] = Spree.t('product_review.flash_messages.destroy.success')
        redirect_to admin_product_product_reviews_path(@product)
      end

      private

      def find_product_review
        @product_review = Spree::ProductReview.find(params[:id])
      end

      def permitted_resource_params
        params.require(:product_review).permit(:title, :review, :rating, :approved, :show_identifier)
      end
    end
  end
end

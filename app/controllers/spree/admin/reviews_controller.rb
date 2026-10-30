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

    class ReviewsController < parent_class
      def model_class
        Spree::ProductReview
      end

      def index; end

      def approve
        review = Spree::ProductReview.find(params[:id])
        review.approve!
        flash[:success] = Spree.t('review_approved')
        redirect_back(fallback_location: admin_reviews_path)
      end

      def disapprove
        review = Spree::ProductReview.find(params[:id])
        review.reject!
        flash[:success] = Spree.t('review_disapproved')
        redirect_back(fallback_location: admin_reviews_path)
      end
    end
  end
end

# frozen_string_literal: true

module Spree
  module Admin
    parent_class = if defined?(Spree::Admin::BaseController)
                     Spree::Admin::BaseController
                   else
                     ActionController::Base
                   end

    class ReviewSettingsController < parent_class
      def edit
        @products = Spree::Product.order(updated_at: :desc).limit(500) if defined?(Spree::Product)
      end

      def update
        if respond_to?(:current_store) && current_store
          current_store.set_preference(:review_status_default, params[:review_status_default]) if current_store.respond_to?(:set_preference)
          current_store.set_preference(:block_spam_reviews, params[:block_spam_reviews] == '1') if current_store.respond_to?(:set_preference)
          current_store.set_preference(:disable_review_links, params[:disable_review_links] == '1') if current_store.respond_to?(:set_preference)
          current_store.set_preference(:spam_words, params[:spam_words]) if current_store.respond_to?(:set_preference)
          current_store.save if current_store.respond_to?(:save)
        end

        flash[:success] = Spree.t('successfully_updated', resource: Spree.t('review_settings'))
        redirect_to edit_admin_review_settings_path
      end
    end
  end
end

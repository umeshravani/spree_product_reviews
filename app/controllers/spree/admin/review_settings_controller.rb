module Spree
    module Admin
      class ReviewSettingsController < Spree::Admin::BaseController
        def edit
          @products = Spree::Product.order(updated_at: :desc).limit(500) 
        end
  
        def update
          current_store.set_preference(:review_status_default, params[:review_status_default])
          current_store.set_preference(:block_spam_reviews, params[:block_spam_reviews] == '1')
          current_store.set_preference(:disable_review_links, params[:disable_review_links] == '1')
          current_store.set_preference(:disable_review_emails, params[:disable_review_emails] == '1')
          
          current_store.set_preference(:spam_words, params[:spam_words])
          
          current_store.save!
  
          flash[:success] = Spree.t(:successfully_updated, resource: Spree.t(:review_settings))
          redirect_to edit_admin_review_settings_path
        end
      end
    end
  end

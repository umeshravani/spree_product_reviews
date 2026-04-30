Spree::Core::Engine.add_routes do
  namespace :admin do
    # GLOBAL REVIEWS
    resources :reviews do
      member do
        get :approve
        get :disapprove
        post :attach_image 
        delete :purge_images
      end
      collection do
        put :bulk_approve
        put :bulk_disapprove
        delete :bulk_destroy
      end
    end

    # NESTED REVIEWS
    resources :products do
      resources :product_reviews, only: %i[index destroy edit update] do
        member do
          get :approve
          get :disapprove
          post :attach_image
          delete :purge_images
        end
        collection do
          put :bulk_approve
          put :bulk_disapprove
          delete :bulk_destroy
        end
      end
    end

    resource :review_settings, only: [:edit, :update]
  end

  namespace :api, defaults: { format: 'json' } do
    namespace :v3 do
      namespace :store do
        resources :products, only: [] do
          resources :product_reviews, only: [:index, :create]
        end
      end
    end
  end

  # Frontend routes (Classic Rails)
  resources :products, only: [] do
    resources :product_reviews, only: %i[index new create]
  end

  get '/forbidden', to: 'spree/home#forbidden', as: :product_reviews_forbidden
end

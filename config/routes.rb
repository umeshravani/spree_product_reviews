Spree::Core::Engine.add_routes do
  namespace :admin do
    # GLOBAL REVIEWS (For the "Reviews" tab)
    resources :reviews do
      member do
        get :approve
        get :disapprove
        post :attach_image 
        delete :purge_images
      end
    end

    # NESTED REVIEWS (For the "Products" tab -> "Reviews")
    resources :products do
      resources :product_reviews, only: %i[index destroy edit update] do
        member do
          get :approve
          get :disapprove
          post :attach_image
          delete :purge_images
        end
      end
    end

    # Review Settings
    resource :review_settings, only: [:edit, :update]
  end

  # Frontend routes
  resources :products, only: [] do
    resources :product_reviews, only: %i[index new create]
  end

  get '/forbidden', to: 'spree/home#forbidden', as: :product_reviews_forbidden
end

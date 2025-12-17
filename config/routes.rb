Spree::Core::Engine.add_routes do
  namespace :admin do
    resources :products do
      resources :product_reviews, only: %i[index destroy edit update] do
        member do
          get :approve
          get :disapprove
          post :attach_image          # Attach images to review
          delete :purge_images        # Delete selected images
        end
      end
    end
  end

  resources :products, only: [] do
    resources :product_reviews, only: %i[index new create]
  end

  get '/forbidden', to: 'spree/home#forbidden', as: :product_reviews_forbidden
end

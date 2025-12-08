Spree::Core::Engine.add_routes do
  namespace :admin do
    resources :products do
      resources :product_reviews, only: %i[index destroy edit update] do
        member do
          get :approve
          get :disapprove
          get '/forbidden', to: 'spree/home#forbidden', as: :admin_forbidden
        end
      end
    end
  end

  resources :products, only: [] do
    resources :product_reviews, only: %i[index new create]
  end

  # Keep the frontend route name as forbidden
  get '/forbidden', to: 'spree/home#forbidden', as: :forbidden
end

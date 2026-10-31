# frozen_string_literal: true

Spree::Core::Engine.add_routes do
  namespace :api, defaults: { format: 'json' } do
    namespace :v3 do
      namespace :store do
        resources :products, only: [] do
          resources :product_reviews, only: [:index, :create, :update, :destroy] do
            member do
              post :vote
            end
          end
        end

        resources :product_reviews, only: [] do
          member do
            post :vote
          end
        end
      end

      namespace :admin do
        resources :products, only: [] do
          get :reviews_summary, to: 'product_reviews#summary'
        end

        resources :product_reviews do
          collection do
            get :counts
            post :bulk_moderate
          end
          member do
            post :approve
            post :reject
            post :mark_spam
            post :unmark_spam
            post :restore
            post :hide
            post :unhide
            delete 'images/:image_id', to: 'product_reviews#destroy_image'
          end
        end
      end
    end
  end

  # Storefront backward compatibility routes
  post '/api/custom_reviews/:product_id', to: 'api/v3/store/product_reviews#create', defaults: { format: 'json' }
  get '/api/custom_reviews/:product_id', to: 'api/v3/store/product_reviews#index', defaults: { format: 'json' }
end

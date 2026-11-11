Spree::Core::Engine.add_routes do
  namespace :api, defaults: { format: 'json' } do
    namespace :v3 do
      namespace :admin do
        resources :reviews, only: [:index, :show, :update, :destroy] do
          collection do
            get :counts
            post :bulk
            get :settings, to: 'review_settings#show'
            patch :settings, to: 'review_settings#update'
            put :settings, to: 'review_settings#update'
          end
          member do
            post :approve
            post :reject
            post :hide
            post :unhide
            post :mark_spam
            post :restore
            delete 'images/:media_id', action: :destroy_media
          end
        end

        resources :review_questions, except: [:new, :edit] do
          resources :options, except: [:new, :edit], controller: 'review_question_options'
        end

        # Backwards-compatible v1 (6.0.0) admin routes
        resource :product_reviews_settings, only: [:show, :update], path: 'product_reviews/settings', controller: 'review_settings'
        resources :product_reviews, controller: 'reviews', only: [:index, :show, :update, :destroy] do
          collection do
            get :counts
            post :bulk_moderate, action: :bulk
          end
          member do
            post :approve
            post :reject
            post :hide
            post :unhide
            post :mark_spam
            post :restore
            delete 'images/:media_id', action: :destroy_media
          end
        end
      end

      namespace :store do
        get 'reviews/settings', to: 'review_settings#show', as: :reviews_settings
        get 'products/review_summaries', to: 'product_review_summaries#index', as: :product_review_summaries

        resources :products, only: [] do
          resources :reviews, only: [:index, :create, :update] do
            collection do
              get :summary, to: 'review_summaries#show'
              get :filters, to: 'review_filters#index'
              get :questions, to: 'review_questions#index'
              get :eligibility, to: 'review_eligibilities#show'
            end
          end

          # Backwards-compatible v1 (6.0.0) store product review routes
          resources :product_reviews, controller: 'reviews', only: [:index, :create, :update] do
            collection do
              get :summary, to: 'review_summaries#show'
            end
          end
        end

        # Backwards-compatible v1 (6.0.0) store settings route
        resource :product_reviews_settings, only: [:show], path: 'product_reviews/settings', controller: 'review_settings'

        resources :reviews, only: [] do
          resources :helpful_votes, only: [:create], controller: 'review_votes'
          resources :reports, only: [:create], controller: 'review_reports'
        end

        namespace :review_media do
          resources :direct_uploads, only: [:create], controller: '/spree/api/v3/store/review_media_direct_uploads'
        end
      end
    end
  end
end

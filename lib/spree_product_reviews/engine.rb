module SpreeProductReviews
  class Engine < Rails::Engine
    require 'spree/core'
    isolate_namespace Spree
    engine_name 'spree_product_reviews'

    config.paths.add 'app/subscribers', eager_load: true

    config.generators do |g|
      g.test_framework :rspec
    end

    initializer 'spree_product_reviews.environment', before: :load_config_initializers do |_app|
      SpreeProductReviews::Config = SpreeProductReviews::Configuration.new
    end

    # Allow cross-origin ActiveStorage direct uploads & media streaming from
    # external storefronts without requiring app-level CORS workarounds.
    initializer 'spree_product_reviews.active_storage_cors', after: :load_config_initializers do |app|
      next unless defined?(Rack::Cors)

      app.config.middleware.insert_before 0, Rack::Cors do
        allow do
          origins '*'
          resource '/rails/active_storage/*',
                   headers: :any,
                   methods: [:get, :put, :post, :head, :options]
        end
      end
    rescue StandardError => e
      if defined?(Rails)
        Rails.logger.warn("[SpreeProductReviews] ActiveStorage CORS middleware setup skipped: #{e.message}")
      end
    end

    config.after_initialize do
      require_dependency root.join('app/subscribers/spree/review_purchase_subscriber').to_s

      unless Spree.subscribers.include?(Spree::ReviewPurchaseSubscriber)
        Spree.subscribers << Spree::ReviewPurchaseSubscriber
      end
    end

    config.to_prepare do
      unless Object.const_defined?('Spree::ProductReview')
        Spree.const_set(:ProductReview, Spree::Review)
      end

      require_dependency SpreeProductReviews::Engine.root.join('app/models/spree_product_reviews/product_decorator').to_s
      require_dependency SpreeProductReviews::Engine.root.join('app/serializers/spree_product_reviews/product_serializer_decorator').to_s
      require_dependency SpreeProductReviews::Engine.root.join('app/serializers/spree_product_reviews/line_item_serializer_decorator').to_s
      require_dependency SpreeProductReviews::Engine.root.join('app/controllers/spree_product_reviews/store_products_controller_decorator').to_s
    end
  end
end

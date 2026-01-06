module SpreeProductReviews
  class Engine < Rails::Engine
    require 'spree/core'
    isolate_namespace Spree
    engine_name 'spree_product_reviews'

    config.generators do |g|
      g.test_framework :rspec
    end

    def self.activate
      Dir.glob(File.join(File.dirname(__FILE__), '../../app/**/*_decorator*.rb')) do |c|
        Rails.configuration.cache_classes ? require(c) : load(c)
      end
    end

    config.to_prepare(&method(:activate).to_proc)

    config.after_initialize do
      Rails.application.reloader.to_prepare do
        if defined?(Spree::ProductReview)
          Spree::ProductReview._validators.delete(:images)
          Spree::ProductReview._validate_callbacks.delete_if do |callback|
            filter = callback.filter
            if filter.is_a?(Symbol) && filter.to_s.include?("image") 
               true
            elsif filter.respond_to?(:attributes) && filter.attributes.include?(:images)
               true
            else
               false
            end
          end
        end
      end
    end
  end
end

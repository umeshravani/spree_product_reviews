# frozen_string_literal: true

require 'rails/engine'

module SpreeProductReviews
  class Engine < Rails::Engine
    require 'spree/core'
    isolate_namespace Spree
    engine_name 'spree_product_reviews'

    initializer 'spree_product_reviews.inflections', before: :set_autoload_paths do
      Rails.autoloaders.each do |autoloader|
        autoloader.inflector.inflect('spree_product_reviews' => 'SpreeProductReviews')
      end
    end

    config.generators do |g|
      g.test_framework :rspec
    end

    config.to_prepare do
      Dir.glob(File.join(File.dirname(__FILE__), '../../app/models/**/*_decorator*.rb')) do |c|
        load(c)
      end
    end

    config.after_initialize do
      if Spree.respond_to?(:permissions) && Spree.permissions.respond_to?(:register_scope)
        Spree.permissions.register_scope(:product_reviews, group: :catalog, resources: -> { [Spree::ProductReview] })
      end

      if defined?(Spree::Product) && Spree::Product.respond_to?(:additional_permitted_attributes)
        unless Spree::Product.additional_permitted_attributes.include?(:reviews_allowed)
          Spree::Product.additional_permitted_attributes << :reviews_allowed
        end
      end

      if defined?(Spree.customer_class) && Spree.customer_class.present?
        customer_klass = Spree.customer_class.to_s.safe_constantize
        if customer_klass && !customer_klass.reflect_on_association(:product_reviews)
          customer_klass.has_many :product_reviews, class_name: 'Spree::ProductReview', foreign_key: :customer_id, dependent: :nullify
        end
      end
    end
  end
end

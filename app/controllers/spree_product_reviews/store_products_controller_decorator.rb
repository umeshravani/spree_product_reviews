module SpreeProductReviews
  module StoreProductsControllerDecorator
    protected

    def scope_includes
      includes = super
      return includes if includes.include?(:review_summaries)

      includes + [:review_summaries]
    end
  end
end

if defined?(Spree::Api::V3::Store::ProductsController)
  unless Spree::Api::V3::Store::ProductsController < SpreeProductReviews::StoreProductsControllerDecorator
    Spree::Api::V3::Store::ProductsController.prepend SpreeProductReviews::StoreProductsControllerDecorator
  end
end


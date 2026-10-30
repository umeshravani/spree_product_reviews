# frozen_string_literal: true

require 'spree_core'
require 'spree_product_reviews/version'
require 'spree_product_reviews/configuration'
require 'spree_product_reviews/engine'

module SpreeProductReviews
  class << self
    def configuration
      @configuration ||= Configuration.new
    end
    alias config configuration

    def configure
      yield(configuration)
    end
  end
end

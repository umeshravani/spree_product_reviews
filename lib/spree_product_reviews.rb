require 'spree'
require 'spree_product_reviews/engine'
require 'spree_product_reviews/version'
require 'spree_product_reviews/configuration'

module SpreeProductReviews
  mattr_accessor :queue

  def self.queue
    @@queue ||= Spree.queues.default
  end

  def self.configuration
    Config
  end

  def self.config
    Config
  end

  def self.configure
    yield(Config)
  end
end

# Backwards-compatible namespace alias for code referencing SpreeReviews directly.
SpreeReviews = SpreeProductReviews unless defined?(SpreeReviews)

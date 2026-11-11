# Configure Rails Environment
unless defined?(Rails) && Rails.application
  ENV['RAILS_ENV'] = 'test'

  require 'dotenv/load'

  dummy_env = File.expand_path('../dummy/config/environment.rb', __FILE__)
  require(File.exist?(dummy_env) ? dummy_env : File.expand_path('config/environment', Dir.pwd))

  require 'spree_dev_tools/rspec/spec_helper'
end

require 'spree/api/testing_support/factories'
require 'spree/api/testing_support/v3/base'
require 'spree_product_reviews/factories' unless FactoryBot.factories.registered?(:review)

# Requires supporting ruby files with custom matchers and macros, etc,
# in spec/support/ and its subdirectories.
Dir[File.join(File.dirname(__FILE__), 'support/**/*.rb')].sort.each { |f| require f }

# encoding: UTF-8
lib = File.expand_path('../lib/', __FILE__)
$LOAD_PATH.unshift lib unless $LOAD_PATH.include?(lib)

require 'spree_product_reviews/version'

Gem::Specification.new do |s|
  s.platform    = Gem::Platform::RUBY
  s.name        = 'spree_product_reviews'
  s.version     = SpreeProductReviews::VERSION
  s.summary     = 'Product Reviews, Ratings, Media Uploads, Q&A & Rewards Extension for Spree Commerce 6'
  s.description = 'Full-featured Spree 6 extension adding verified product reviews, ratings, photo & video direct uploads, dynamic Q&A questionnaires, moderation workflows, Gift Card incentives, and Store/Admin API v3 endpoints.'
  s.required_ruby_version = '>= 3.2'

  s.authors  = ['Umesh Ravani', 'laaichiu']
  s.email    = 'umeshravani98@gmail.com'
  s.homepage = 'https://github.com/umeshravani/spree_product_reviews'
  s.license  = 'MIT'

  s.files        = Dir['{app,config,db,lib,vendor}/**/*', 'LICENSE*', 'Rakefile', 'README.md'].reject { |f| f.match(/^spec/) && !f.match(/^spec\/fixtures/) }
  s.require_path = 'lib'
  s.requirements << 'none'

  s.add_dependency 'spree', '>= 6.0', '< 7.0'

  s.add_development_dependency 'spree_dev_tools', '= 1.0.0.beta2'
end


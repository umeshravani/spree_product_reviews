# encoding: UTF-8

Gem::Specification.new do |s|
  s.platform    = Gem::Platform::RUBY
  s.name        = 'spree_product_reviews'
  s.version     = '6.0.0'
  s.authors     = ['Umesh Ravani']
  s.email       = 'umeshravani98@gmail.com'
  s.summary     = 'Product Reviews and Ratings Extension for Spree Commerce 6'
  s.description = 'Standalone, production-grade product reviews, ratings, verified buyer checks, and moderation for Spree 6.'
  s.homepage    = 'https://github.com/umeshravani/spree_product_reviews'
  s.license     = 'MIT'

  s.required_ruby_version = '>= 3.2'

  s.files        = Dir['{app,config,db,lib,vendor}/**/*', 'Rakefile', 'LICENSE', 'README.md'].reject { |f| f.match(/^spec/) && !f.match(/^spec\/fixtures/) }
  s.require_path = 'lib'

  s.add_dependency 'spree_core', '>= 6.0.0'
end

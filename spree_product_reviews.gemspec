lib = File.expand_path("lib", __dir__)
$LOAD_PATH.unshift lib unless $LOAD_PATH.include?(lib)

require "spree_product_reviews/version"

Gem::Specification.new do |s|
  s.platform    = Gem::Platform::RUBY
  s.name        = "spree_product_reviews"
  s.version     = SpreeProductReviews::VERSION
  s.summary     = "Spree Commerce Product reviews Extension"
  s.required_ruby_version = ">= 3.0"

  s.author    = "Umesh Ravani"
  s.email     = "umeshravani98@gmail.com"
  s.homepage  = "https://github.com/umeshravani/spree_product_reviews"
  s.license   = "AGPL-3.0-or-later"

  s.files = Dir["{app,config,db,lib,vendor}/**/*", "LICENSE.md", "Rakefile", "README.md"].reject do |f|
    f.match(/^spec/) && !f.match(%r{^spec/fixtures})
  end
  s.require_path = "lib"
  s.requirements << "none"
  s.add_dependency "spree_core", ">= 5.0"
  s.add_dependency "spree_admin", ">= 5.0"
  s.add_dependency "spree_storefront", ">= 5.0"

  s.add_dependency "spree_auth_devise"
  s.add_dependency "spree_extension"

  s.add_development_dependency "faker"
  s.add_development_dependency "pg"
  s.add_development_dependency "spree_dev_tools"
  s.add_development_dependency "sqlite3"
end

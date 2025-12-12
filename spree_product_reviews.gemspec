lib = File.expand_path('lib', __dir__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)

require 'spree_product_reviews/version'

Gem::Specification.new do |spec|
  spec.name          = 'spree_product_reviews'
  spec.version       = SpreeProductReviews::VERSION
  spec.platform      = Gem::Platform::RUBY
  spec.summary       = 'Spree Commerce Product Reviews Extension'
  spec.description   = 'Product reviews and ratings system for Spree Commerce 5.x stores.'
  spec.required_ruby_version = '>= 3.2'

  # Author info
  spec.authors       = ['Umesh Ravani']
  spec.email         = ['umeshravani98@gmail.com']
  spec.homepage      = 'https://github.com/umeshravani/spree_product_reviews'
  spec.license       = 'AGPL-3.0-or-later'

  # Automatically include most important files
  spec.files = Dir.glob([
    'lib/**/*',
    'app/**/*',
    'config/**/*',
    'db/**/*',
    'public/**/*',
    'README.md',
    'LICENSE.md'
  ])

  spec.require_paths = ['lib']
  # Compatibility with Spree 5.2 without locking to specific frontends.
  spec.add_dependency 'spree_core', '>= 5.2'
  
  # Kept without version lock to allow the main Gemfile to handle the git branch
  spec.add_dependency 'spree_auth_devise'
  
  spec.add_dependency 'spree_extension'

  # Development dependencies
  spec.add_development_dependency 'spree_dev_tools'
  # specific dev dependencies for this gem can be kept if needed (faker/pg), 
  # but often dev_tools handles the basics.
  spec.add_development_dependency 'faker' 

  # RubyGems.org metadata
  spec.metadata = {
    'source_code_uri' => spec.homepage,
    'changelog_uri'   => "#{spec.homepage}/blob/main/CHANGELOG.md"
  }
end

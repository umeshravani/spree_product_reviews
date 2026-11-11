source 'https://rubygems.org'

gem 'rails-controller-testing'

if ENV['SPREE_PATH']
  spree_path = File.expand_path(ENV.fetch('SPREE_PATH'))
  gem 'spree', path: spree_path
  gem 'spree_core', path: File.join(spree_path, 'core')
  gem 'spree_api', path: File.join(spree_path, 'api')
else
  gem 'spree', '>= 6.0', '< 7.0'
end

gem 'spree_dev_tools', '= 1.0.0.beta2'

if ENV['DB'] == 'mysql'
  gem 'mysql2'
elsif ENV['DB'] == 'postgres'
  gem 'pg'
else
  gem 'sqlite3'
end

gem 'propshaft'

gemspec

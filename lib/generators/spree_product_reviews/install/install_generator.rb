module SpreeProductReviews
  module Generators
    class InstallGenerator < Rails::Generators::Base
      class_option :migrate, type: :boolean, default: true

      desc 'Installs SpreeProductReviews: copies migrations (including automatic v1 -> v2 upgrade), preserves custom initializers, and runs db:migrate.'

      def add_migrations
        run 'bundle exec rake railties:install:migrations FROM=spree_product_reviews'
      end

      def run_migrations
        run_migrations = options[:migrate] || ['', 'y', 'Y'].include?(ask('Would you like to run the migrations now? [Y/n]'))
        if run_migrations
          run 'bin/rails db:migrate'
        else
          puts "Skipping rails db:migrate, don't forget to run it!"
        end
      end
    end
  end
end

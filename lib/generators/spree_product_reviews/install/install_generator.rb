# frozen_string_literal: true

require 'rails/generators'

module SpreeProductReviews
  module Generators
    class InstallGenerator < Rails::Generators::Base
      source_root File.expand_path('templates', __dir__)

      class_option :migrate, type: :boolean, default: true
      class_option :auto_run_migrations, type: :boolean, default: false

      desc 'Installs SpreeProductReviews: copies migrations, creates initializer, and registers Spree 6 dependencies.'

      def add_migrations
        say_status :installing, 'Copying SpreeProductReviews migrations...', :green
        run 'bundle exec rake railties:install:migrations FROM=spree_product_reviews'
      end

      def create_initializer
        initializer_path = File.join(Rails.root, 'config', 'initializers', 'spree_product_reviews.rb')
        return if File.exist?(initializer_path)

        say_status :creating, 'Creating config/initializers/spree_product_reviews.rb...', :green
        create_file initializer_path, <<~RUBY
          # frozen_string_literal: true

          SpreeProductReviews.configure do |config|
            # Master toggle for reviews
            config.enabled = true

            # Moderation & workflow
            config.require_approval = true
            config.review_status_default = 'pending'

            # Customer permissions
            config.allow_anonymous = false
            config.allow_unverified = true

            # Media attachments (Active Storage)
            config.max_images_upload = 5
            config.max_image_size_mb = 5

            # Anti-abuse safeguards
            config.block_spam_reviews = true
            config.disable_review_links = true
            config.spam_words = ''
          end
        RUBY
      end

      def run_migrations
        if options[:auto_run_migrations] || options[:migrate]
          say_status :migrating, 'Running database migrations...', :green
          run 'bin/rails db:migrate'
        else
          say_status :info, 'Skipping database migrations. Run `bin/rails db:migrate` when ready.', :yellow
        end
      end

      def check_dashboard_integration
        dashboard_pkg = File.join(Rails.root, '..', 'apps', 'dashboard', 'package.json')
        if File.exist?(dashboard_pkg)
          say_status :dashboard, 'Detected Spree React Dashboard in apps/dashboard/', :cyan
          say_status :dashboard, 'To enable the React Dashboard moderation UI without editing source files, run:', :cyan
          say_status :command, '  pnpm --filter dashboard add @spree/product-reviews-dashboard', :green
        end
      end
    end
  end
end

module SpreeProductReviews
  module Generators
    class InstallGenerator < Rails::Generators::Base
      class_option :migrate, type: :boolean, default: true

      def add_migrations
        run 'bundle exec rake railties:install:migrations FROM=spree_product_reviews'
      end

      def run_migrations
        run_migrations = options[:migrate] || ['', 'y', 'Y'].include?(
          ask('Would you like to run the migrations now? [Y/n]')
        )

        if run_migrations
          run 'bin/rails db:migrate'
        else
          puts 'Skipping rails db:migrate, don\'t forget to run it!'
        end
      end

      def add_reviews_page_block
        say_status :spree_product_reviews, "Adding Reviews block to Product Details sections", :green

        # Load app environment explicitly (important for generators)
        require Rails.root.join("config/environment")

        Spree::PageSection
          .where(type: "Spree::PageSections::ProductDetails")
          .find_each do |section|

            next if section.blocks.exists?(
              type: "Spree::PageBlocks::Products::Reviews"
            )

            section.blocks.create!(
              type: "Spree::PageBlocks::Products::Reviews",
              position: section.blocks.maximum(:position).to_i + 1
            )
          end
      end
    end
  end
end

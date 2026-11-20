module Spree
  module Emails
    module Samples
      base_class = defined?(Spree::Emails::Samples::Base) ? Spree::Emails::Samples::Base : Object

      class ProductReview < base_class
        def self.record_type
          'review'
        end

        def self.required_permissions
          %w[read_reviews]
        end

        def variables
          sample_review = (record rescue nil)
          product_name = sample_review&.product&.name || 'Handcrafted Wall Art Test'
          product_slug = sample_review&.product&.slug || 'handcrafted-wall-art-test'
          store_url = store&.storefront_url.presence || 'https://example.com'
          product_url = "#{store_url.chomp('/')}/products/#{product_slug}"

          {
            review: {
              id: sample_review&.prefixed_id || 'rev_sample123',
              rating: sample_review&.rating || 5,
              title: sample_review&.title || 'Exceptional craftsmanship & prompt delivery',
              body: sample_review&.body || 'The detailing and finish exceeded my expectations. Outstanding quality!',
              author_name: sample_review&.reviewer_name.presence || 'Rahul Sharma',
              product_name: product_name,
              product_url: product_url,
              verified_purchase: sample_review ? sample_review.verified_purchase : true,
              moderator_note: sample_review&.moderator_note || '',
              created_at: (sample_review&.created_at || Time.current).to_s
            },
            product: {
              id: sample_review&.product&.id || 'prod_sample123',
              name: product_name,
              url: product_url
            },
            review_url: product_url
          }
        end

        protected

        def records
          Spree::Review.for_store(store).order(created_at: :desc)
        end
      end
    end
  end
end

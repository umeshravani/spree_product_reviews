# frozen_string_literal: true

module SpreeProductReviews
  module Spree
    module CustomerDecorator
      def self.prepended(base)
        base.has_many :product_reviews, class_name: 'Spree::ProductReview', foreign_key: :customer_id, dependent: :nullify unless base.reflect_on_association(:product_reviews)
        base.has_many :review_votes, class_name: 'Spree::ReviewVote', foreign_key: :customer_id, dependent: :nullify unless base.reflect_on_association(:review_votes)
      end

      def product_review_for(product)
        product_reviews.find_by(product_id: product.id)
      end
    end
  end
end

if defined?(Spree.customer_class) && Spree.customer_class.present?
  customer_klass = Spree.customer_class.to_s.safe_constantize
  if customer_klass && !customer_klass.ancestors.include?(SpreeProductReviews::Spree::CustomerDecorator)
    customer_klass.prepend(SpreeProductReviews::Spree::CustomerDecorator)
  end
end

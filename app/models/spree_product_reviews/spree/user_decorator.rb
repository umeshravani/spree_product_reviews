# frozen_string_literal: true

module SpreeProductReviews
  module Spree
    module UserDecorator
      def self.prepended(base)
        base.has_many :product_reviews, class_name: 'Spree::ProductReview', dependent: :destroy, foreign_key: :user_id unless base.reflect_on_association(:product_reviews)
      end

      def product_review_for(product)
        product_reviews.find_by(product_id: product.id)
      end
    end
  end
end

if defined?(Spree.user_class) && Spree.user_class.present?
  klass = Spree.user_class.to_s.safe_constantize
  if klass && !klass.ancestors.include?(SpreeProductReviews::Spree::UserDecorator)
    klass.prepend(SpreeProductReviews::Spree::UserDecorator)
  end
end

# frozen_string_literal: true

module SpreeProductReviews
  module Spree
    module ProductDecorator
      def self.prepended(base)
        base.has_many :product_reviews, class_name: 'Spree::ProductReview', dependent: :destroy unless base.reflect_on_association(:product_reviews)
        base.has_many :reviews, class_name: 'Spree::ProductReview', dependent: :destroy unless base.reflect_on_association(:reviews)
        base.has_many :approved_reviews, -> { approved }, class_name: 'Spree::ProductReview' unless base.reflect_on_association(:approved_reviews)
      end

      def reviews_allowed?
        respond_to?(:reviews_allowed) ? reviews_allowed : true
      end
    end
  end
end

if defined?(Spree::Product) && !Spree::Product.ancestors.include?(SpreeProductReviews::Spree::ProductDecorator)
  Spree::Product.prepend(SpreeProductReviews::Spree::ProductDecorator)
end

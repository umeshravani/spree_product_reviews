module SpreeProductReviews
  module Spree
    module ProductDecorator
      def self.prepended(base)
        base.has_many :product_reviews, class_name: 'Spree::ProductReview', dependent: :destroy
      end

      ::Spree::Product.prepend self
    end
  end
end

Spree::Product.prepend SpreeProductReviews::Spree::ProductDecorator
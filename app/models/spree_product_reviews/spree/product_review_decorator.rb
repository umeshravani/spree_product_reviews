module SpreeProductReviews
  module Spree
    module ProductReviewDecorator
      def self.prepended(base)
        base.has_one_attached :attachment
        base.has_many_attached :images
      end
    end
  end
end

Spree::ProductReview.prepend SpreeProductReviews::Spree::ProductReviewDecorator if defined?(Spree::ProductReview)

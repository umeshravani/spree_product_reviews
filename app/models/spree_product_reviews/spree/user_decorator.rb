module SpreeProductReviews
  module Spree
    module UserDecorator
      def self.prepended(base)
        base.has_many :product_reviews, class_name: "Spree::ProductReview", dependent: :destroy, foreign_key: :user_id
      end

      def product_review_for(product)
        product_reviews.find_by(product_id: product.id, user_id: id)
      end

      def recent_purchase_date_for(product)
        orders.joins(:line_items, :variants).where(
          spree_variants: { product_id: product.id }
        ).order("spree_orders.completed_at DESC").first&.completed_at
      end
    end
  end
end

Spree.user_class.prepend SpreeProductReviews::Spree::UserDecorator


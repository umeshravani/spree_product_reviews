module Spree
  class ProductReviewSummary < Spree.base_class
    has_prefix_id :revs

    attribute :average_rating, :decimal, default: 0
    attribute :reviews_count, :integer, default: 0
    attribute :rating_1_count, :integer, default: 0
    attribute :rating_2_count, :integer, default: 0
    attribute :rating_3_count, :integer, default: 0
    attribute :rating_4_count, :integer, default: 0
    attribute :rating_5_count, :integer, default: 0
    attribute :summary_data, default: -> { {} }

    belongs_to :product, class_name: 'Spree::Product', inverse_of: :review_summary
    belongs_to :store, class_name: 'Spree::Store'

    validates :product, :store, presence: true
    validates :product_id, uniqueness: { scope: :store_id }
    validates :average_rating, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 5 }
    validates :reviews_count,
              :rating_1_count,
              :rating_2_count,
              :rating_3_count,
              :rating_4_count,
              :rating_5_count,
              numericality: { only_integer: true, greater_than_or_equal_to: 0 }

    def self.recalculate!(product_id:, store_id:)
      summary = find_or_initialize_by(product_id: product_id, store_id: store_id)
      counts = Spree::Review.approved.where(product_id: product_id, store_id: store_id).group(:rating).count
      reviews_count = counts.values.sum
      weighted_total = counts.sum { |rating, count| rating.to_i * count }

      summary.assign_attributes(
        reviews_count: reviews_count,
        average_rating: reviews_count.positive? ? (weighted_total.to_d / reviews_count).round(2) : 0,
        rating_1_count: counts.fetch(1, 0),
        rating_2_count: counts.fetch(2, 0),
        rating_3_count: counts.fetch(3, 0),
        rating_4_count: counts.fetch(4, 0),
        rating_5_count: counts.fetch(5, 0)
      )
      summary.save!
      summary
    end

    def rating_distribution
      {
        1 => rating_1_count,
        2 => rating_2_count,
        3 => rating_3_count,
        4 => rating_4_count,
        5 => rating_5_count
      }
    end
  end
end

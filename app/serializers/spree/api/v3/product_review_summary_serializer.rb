module Spree
  module Api
    module V3
      class ProductReviewSummarySerializer < BaseSerializer
        typelize product_id: :string,
                 average_rating: :number,
                 reviews_count: :number,
                 rating_distribution: :object,
                 summary_data: :object

        attributes :reviews_count, :summary_data, created_at: :iso8601, updated_at: :iso8601

        attribute :product_id do |summary|
          summary.product.prefixed_id
        end

        attribute :average_rating do |summary|
          summary.average_rating.to_f
        end

        attribute :rating_distribution do |summary|
          summary.rating_distribution.transform_keys(&:to_s)
        end
      end
    end
  end
end

module SpreeProductReviews
  module LineItemSerializerDecorator
    def self.prepended(base)
      base.include(SpreeProductReviews::StoreReviewSerializerSupport)
      return if base._attributes.key?(:reviews_count)

      base.typelize product_id: [:string, nullable: true],
                    average_rating: :number,
                    reviews_count: :number

      base.attribute :product_id do |line_item|
        line_item.product&.prefixed_id
      end

      base.attribute :average_rating do |line_item|
        store = params[:store] || line_item.order&.store || Spree::Current.store
        review_summary_payload_for(line_item.product, store: store)[:average_rating]
      end

      base.attribute :reviews_count do |line_item|
        store = params[:store] || line_item.order&.store || Spree::Current.store
        review_summary_payload_for(line_item.product, store: store)[:reviews_count]
      end
    end
  end
end

if defined?(Spree::Api::V3::LineItemSerializer)
  unless Spree::Api::V3::LineItemSerializer < SpreeProductReviews::LineItemSerializerDecorator
    Spree::Api::V3::LineItemSerializer.prepend SpreeProductReviews::LineItemSerializerDecorator
  end
end


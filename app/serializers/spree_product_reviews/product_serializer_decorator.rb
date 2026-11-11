module SpreeProductReviews
  module StoreReviewSerializerSupport
    def review_summary_payload_for(product, store:)
      return { average_rating: 0.0, reviews_count: 0 } if product.blank? || store.blank?

      settings = cached_review_settings_for(store)
      return { average_rating: 0.0, reviews_count: 0 } unless settings[:enabled]

      summary = product.review_summaries.detect { |record| record.store_id == store.id }
      {
        average_rating: summary&.average_rating.to_f,
        reviews_count: summary&.reviews_count.to_i
      }
    rescue ActiveRecord::StatementInvalid
      { average_rating: 0.0, reviews_count: 0 }
    end

    private

    def cached_review_settings_for(store)
      @review_settings_by_store ||= {}
      @review_settings_by_store[store.id] ||= Spree::ReviewSetting.for_store(store)
    end
  end

  module ProductSerializerDecorator
    def self.prepended(base)
      base.include(SpreeProductReviews::StoreReviewSerializerSupport)
      return if base._attributes.key?(:reviews_count)

      base.typelize average_rating: :number, reviews_count: :number

      base.attribute :average_rating do |product|
        store = params[:store] || Spree::Current.store
        review_summary_payload_for(product, store: store)[:average_rating]
      end

      base.attribute :reviews_count do |product|
        store = params[:store] || Spree::Current.store
        review_summary_payload_for(product, store: store)[:reviews_count]
      end
    end
  end
end

if defined?(Spree::Api::V3::ProductSerializer)
  unless Spree::Api::V3::ProductSerializer < SpreeProductReviews::ProductSerializerDecorator
    Spree::Api::V3::ProductSerializer.prepend SpreeProductReviews::ProductSerializerDecorator
  end
end


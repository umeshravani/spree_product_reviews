require 'spec_helper'

RSpec.describe Spree::Api::V3::Store::ProductReviewSummariesController, type: :controller do
  render_views
  routes { Spree::Core::Engine.routes }

  include_context 'API v3 Store'

  let(:product_one) { create(:product, store: store, name: 'Product One') }
  let(:product_two) { create(:product, store: store, name: 'Product Two') }

  before do
    request.headers['X-Spree-Api-Key'] = api_key.token
    Spree::ReviewSetting.update_for_store!(store, enabled: true)
    create(:review, :approved, product: product_one, store: store, rating: 5)
    create(:review, :approved, product: product_one, store: store, rating: 3)
  end

  describe 'GET #index' do
    it 'returns batch product rating summaries keyed by prefixed product ID' do
      get :index, params: { product_ids: "#{product_one.prefixed_id},#{product_two.prefixed_id}" }, as: :json

      expect(response).to have_http_status(:ok)
      data = json_response['data']
      expect(data[product_one.prefixed_id]['reviews_count']).to eq(2)
      expect(data[product_one.prefixed_id]['average_rating']).to eq(4.0)
      expect(data[product_two.prefixed_id]['reviews_count']).to eq(0)
      expect(data[product_two.prefixed_id]['average_rating']).to eq(0.0)
    end

    it 'returns empty hash when reviews are disabled for the store' do
      Spree::ReviewSetting.update_for_store!(store, enabled: false)

      get :index, params: { product_ids: product_one.prefixed_id }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response['data']).to eq({})
    end
  end

  describe 'ProductSerializer & LineItemSerializer decorators' do
    it 'includes average_rating and reviews_count on products and line items' do
      product_one.review_summaries.reload
      serialized_product = Spree::Api::V3::ProductSerializer.new(product_one, params: { store: store, currency: 'USD' }).to_h
      expect(serialized_product['reviews_count']).to eq(2)
      expect(serialized_product['average_rating']).to eq(4.0)

      order = create(:order_with_line_items, store: store, line_items_count: 1)
      line_item = order.line_items.first
      create(:review, :approved, product: line_item.product, store: store, rating: 5)
      line_item.product.review_summaries.reload

      serialized_item = Spree::Api::V3::LineItemSerializer.new(line_item, params: { store: store, currency: 'USD' }).to_h
      expect(serialized_item['product_id']).to eq(line_item.product.prefixed_id)
      expect(serialized_item['reviews_count']).to eq(1)
      expect(serialized_item['average_rating']).to eq(5.0)
    end

    it 'zeros rating fields when reviews are disabled in store settings' do
      Spree::ReviewSetting.update_for_store!(store, enabled: false)
      product_one.review_summaries.reload

      serialized_product = Spree::Api::V3::ProductSerializer.new(product_one, params: { store: store, currency: 'USD' }).to_h
      expect(serialized_product['reviews_count']).to eq(0)
      expect(serialized_product['average_rating']).to eq(0.0)
    end
  end
end


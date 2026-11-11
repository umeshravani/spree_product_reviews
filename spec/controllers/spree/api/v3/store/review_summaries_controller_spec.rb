require 'spec_helper'
require 'spree/api/testing_support/v3/base'

RSpec.describe Spree::Api::V3::Store::ReviewSummariesController, type: :controller do
  render_views
  routes { Spree::Core::Engine.routes }

  include_context 'API v3 Store'

  let(:product) { create(:product, store: store) }

  before do
    request.headers['X-Spree-Api-Key'] = api_key.token
  end

  describe 'GET #show' do
    it 'returns the rating summary for approved reviews' do
      create(:review, :approved, product: product, store: store, rating: 5)
      create(:review, :approved, product: product, store: store, rating: 4)
      create(:review, product: product, store: store, rating: 1)

      get :show, params: { product_id: product.prefixed_id }

      expect(response).to have_http_status(:ok)
      expect(json_response['product_id']).to eq(product.prefixed_id)
      expect(json_response['reviews_count']).to eq(2)
      expect(json_response['average_rating']).to eq(4.5)
      expect(json_response['rating_distribution']).to include('5' => 1, '4' => 1, '1' => 0)
    end

    it 'can return a summary for verified purchase reviews only' do
      create(:review, :approved, :verified_purchase, product: product, store: store, rating: 5)
      create(:review, :approved, product: product, store: store, rating: 1)

      get :show, params: { product_id: product.prefixed_id, verified_purchase: true }

      expect(response).to have_http_status(:ok)
      expect(json_response['reviews_count']).to eq(1)
      expect(json_response['average_rating']).to eq(5.0)
      expect(json_response['rating_distribution']).to include('5' => 1, '1' => 0)
    end
  end
end

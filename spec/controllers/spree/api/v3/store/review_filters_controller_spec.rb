require 'spec_helper'
require 'spree/api/testing_support/v3/base'

RSpec.describe Spree::Api::V3::Store::ReviewFiltersController, type: :controller do
  render_views
  routes { Spree::Core::Engine.routes }

  include_context 'API v3 Store'

  let(:product) { create(:product, store: store) }

  before do
    request.headers['X-Spree-Api-Key'] = api_key.token
  end

  describe 'GET #index' do
    it 'returns rating, image, verified purchase, and question facets' do
      fit_question = create(:review_question, store: store, key: 'overall_fit', label: 'Overall Fit')
      true_to_size = create(:review_question_option, question: fit_question, value: 'true_to_size', label: 'True to size')
      review = create(:review, :approved, :verified_purchase, product: product, store: store, rating: 5)
      create(:review_answer, review: review, question: fit_question, option: true_to_size)
      create(:review_media, review: review)

      get :index, params: { product_id: product.prefixed_id }

      expect(response).to have_http_status(:ok)
      expect(json_response['total_count']).to eq(1)
      expect(json_response['sort_options'].map { |option| option['id'] }).to include('most_recent', 'most_helpful')

      rating_filter = json_response['filters'].find { |filter| filter['id'] == 'rating' }
      fit_filter = json_response['filters'].find { |filter| filter['id'] == 'overall_fit' }
      images_filter = json_response['filters'].find { |filter| filter['id'] == 'with_images' }

      expect(rating_filter['values'].find { |value| value['value'] == '5' }['count']).to eq(1)
      expect(fit_filter['values'].find { |value| value['value'] == 'true_to_size' }['count']).to eq(1)
      expect(images_filter['values'].first['count']).to eq(1)
    end

    it 'can build facets from verified purchase reviews only' do
      create(:review, :approved, :verified_purchase, product: product, store: store, rating: 5)
      create(:review, :approved, product: product, store: store, rating: 1)

      get :index, params: { product_id: product.prefixed_id, verified_purchase: true }

      expect(response).to have_http_status(:ok)
      expect(json_response['total_count']).to eq(1)

      rating_filter = json_response['filters'].find { |filter| filter['id'] == 'rating' }

      expect(rating_filter['values'].find { |value| value['value'] == '5' }['count']).to eq(1)
      expect(rating_filter['values'].find { |value| value['value'] == '1' }['count']).to eq(0)
    end
  end
end

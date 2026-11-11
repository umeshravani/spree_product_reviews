require 'spec_helper'

RSpec.describe Spree::Api::V3::Admin::ReviewsController, type: :controller do
  render_views
  routes { Spree::Core::Engine.routes }
  include_context 'API v3 Admin with custom permissions'

  let(:review) { create(:review, store: store) }
  before { request.headers.merge!(headers) }

  context 'with product access only' do
    let(:custom_permissions) { %w[write_products] }

    it 'cannot read reviews' do
      get :index, as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end

  context 'with read-only review access' do
    let(:custom_permissions) { %w[read_reviews] }

    it 'can read reviews but cannot approve them' do
      get :index, as: :json
      expect(response).to have_http_status(:ok)

      post :approve, params: { id: review.prefixed_id }, as: :json
      expect(response).to have_http_status(:forbidden)
      expect(review.reload.status).to eq('pending')
    end
  end

  context 'with review write access' do
    let(:custom_permissions) { %w[write_reviews] }

    it 'can moderate reviews in the current store' do
      post :approve, params: { id: review.prefixed_id }, as: :json
      expect(response).to have_http_status(:ok)
      expect(review.reload.status).to eq('approved')
    end

    it 'cannot moderate another store’s review' do
      other_review = create(:review, store: create(:store))
      post :approve, params: { id: other_review.prefixed_id }, as: :json
      expect(response).to have_http_status(:not_found)
      expect(other_review.reload.status).to eq('pending')
    end
  end
  context 'with a read-only secret API key' do
    let(:review_key) { create(:api_key, :secret, store: store, scopes: %w[read_reviews]) }
    let(:headers) { { 'X-Spree-Api-Key' => review_key.plaintext_token } }

    it 'can read but cannot approve a review' do
      get :index, as: :json
      expect(response).to have_http_status(:ok)

      post :approve, params: { id: review.prefixed_id }, as: :json
      expect(response).to have_http_status(:forbidden)
      expect(review.reload.status).to eq('pending')
    end
  end

end

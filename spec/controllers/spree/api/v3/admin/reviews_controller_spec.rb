require 'spec_helper'

RSpec.describe Spree::Api::V3::Admin::ReviewsController, type: :controller do
  render_views
  routes { Spree::Core::Engine.routes }

  include_context 'API v3 Admin authenticated'

  let(:product) { create(:product, store: store) }
  let(:review_user) { create(:user, first_name: 'Jacqueline', last_name: 'Brown') }
  let!(:review) do
    create(
      :review,
      product: product,
      store: store,
      customer: review_user,
      title: 'Needs review',
      status: 'pending',
      reviewer_name: 'Old Public Name',
      metadata: { moderation: 'queued' }
    )
  end

  before { request.headers.merge!(headers) }

  describe 'GET #index' do
    it 'returns reviews for the current store' do
      other_store = create(:store)
      create(:review, store: other_store)

      get :index, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response['data'].map { |item| item['id'] }).to contain_exactly(review.prefixed_id)
      expect(json_response['data'].first['store_id']).to eq(store.prefixed_id)
    end

    it 'supports admin ransack filters' do
      create(:review, :approved, product: product, store: store)

      get :index, params: { q: { status_eq: 'pending' } }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response['data'].map { |item| item['id'] }).to eq([review.prefixed_id])
    end
  end

  describe 'GET #show' do
    it 'serializes admin-only fields' do
      get :show, params: { id: review.prefixed_id }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response['id']).to eq(review.prefixed_id)
      expect(json_response['metadata']).to eq('moderation' => 'queued')
      expect(json_response['product_id']).to eq(product.prefixed_id)
      expect(json_response).to have_key('customer_id')
      expect(json_response).to have_key('order_id')
      expect(json_response['reviewer_name']).to eq('Jacqueline Brown')
    end

    it 'returns the current customer profile name as the reviewer name' do
      review_user.update!(first_name: 'Solomia', last_name: 'Smith')

      get :show, params: { id: review.prefixed_id }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response['reviewer_name']).to eq('Solomia Smith')
    end

    it 'returns an attributed order ID for legacy reviews missing order_id' do
      order = create(:shipped_order, customer: review_user, store: store, variants: [product.default_variant])
      order.update!(completed_at: 2.days.ago)
      review.update_columns(order_id: nil, variant_id: nil, created_at: 1.day.ago, updated_at: 1.day.ago)

      get :show, params: { id: review.prefixed_id }, as: :json

      expect(response).to have_http_status(:ok)
      expect(review.reload.order).to be_nil
      expect(json_response['order_id']).to eq(order.prefixed_id)
    end
  end

  describe 'PATCH #update' do
    it 'updates review moderation fields' do
      patch :update,
            params: {
              id: review.prefixed_id,
              title: 'Reviewed title',
              status: 'approved',
              verified_purchase: true,
              metadata: { moderation: 'approved' }
            },
            as: :json

      expect(response).to have_http_status(:ok)
      expect(review.reload).to have_attributes(
        title: 'Reviewed title',
        status: 'approved',
        verified_purchase: false
      )
      expect(review.metadata).to eq('moderation' => 'approved')
    end
  end

  describe 'POST #approve' do
    it 'approves a review' do
      post :approve, params: { id: review.prefixed_id }, as: :json

      expect(response).to have_http_status(:ok)
      expect(review.reload.status).to eq('approved')
      expect(json_response['status']).to eq('approved')
    end
  end

  describe 'POST #reject' do
    it 'rejects a review' do
      post :reject, params: { id: review.prefixed_id }, as: :json

      expect(response).to have_http_status(:ok)
      expect(review.reload.status).to eq('rejected')
      expect(json_response['status']).to eq('rejected')
    end
  end

  describe 'DELETE #destroy' do
    it 'deletes a review' do
      expect {
        delete :destroy, params: { id: review.prefixed_id }, as: :json
      }.to change(Spree::Review, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end

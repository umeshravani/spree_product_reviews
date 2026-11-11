require 'spec_helper'
require 'stringio'

RSpec.describe Spree::Api::V3::Admin::ReviewsController, type: :controller do
  render_views
  routes { Spree::Core::Engine.routes }

  include_context 'API v3 Admin authenticated'

  let(:product) { create(:product, store: store, name: 'Handcrafted Painting') }
  let(:customer) { create(:user, first_name: 'Neha', last_name: 'Sharma') }
  let!(:pending_review) do
    create(
      :review,
      product: product,
      store: store,
      customer: customer,
      title: 'Pending artwork',
      body: 'Nice colors',
      status: 'pending',
      rating: 4
    )
  end
  let!(:approved_review) do
    create(
      :review,
      :approved,
      product: product,
      store: store,
      title: 'Loved the frame',
      body: 'Looks sharp on the wall',
      rating: 5
    )
  end

  before { request.headers.merge!(headers) }

  describe 'GET #counts' do
    it 'returns counts per moderation status bucket' do
      create(:review, :rejected, product: product, store: store)

      get :counts, as: :json

      expect(response).to have_http_status(:ok)
      counts = json_response['data']
      expect(counts['all']).to eq(3)
      expect(counts['pending']).to eq(1)
      expect(counts['approved']).to eq(1)
      expect(counts['rejected']).to eq(1)
    end
  end

  describe 'GET #index with search, product, verified, media and rating filters' do
    it 'filters by search term across product name and title as well as rating' do
      get :index, params: { search: 'Handcrafted', rating: 4 }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response['data'].map { |r| r['id'] }).to eq([pending_review.prefixed_id])
      expect(json_response['data'].first['product_name']).to eq('Handcrafted Painting')
    end

    it 'filters by product_id, verified_purchase, and media_type' do
      verified_review = create(
        :review,
        :approved,
        :verified_purchase,
        product: product,
        store: store,
        title: 'Verified video review'
      )
      video_media = verified_review.review_media.build(position: 0)
      video_media.attachment.attach(
        io: StringIO.new('video payload'),
        filename: 'verified.mp4',
        content_type: 'video/mp4'
      )
      video_media.save!

      get :index, params: { product_id: product.prefixed_id, verified_purchase: 'true', media_type: 'videos' }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response['data'].map { |r| r['id'] }).to eq([verified_review.prefixed_id])
    end
  end

  describe 'moderation actions & media removal' do
    it 'hides, unhides, marks spam, restores, and removes video/image attachments with audit logs' do
      video_media = approved_review.review_media.build(position: 0)
      video_media.attachment.attach(
        io: StringIO.new('video payload'),
        filename: 'wall.mp4',
        content_type: 'video/mp4'
      )
      video_media.save!

      post :hide, params: { id: approved_review.prefixed_id, moderator_note: 'Check quality' }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_response['status']).to eq('hidden')
      expect(json_response['hidden']).to eq(true)

      post :unhide, params: { id: approved_review.prefixed_id, moderator_note: 'Cleared' }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_response['status']).to eq('approved')
      expect(json_response['media'].first['media_type']).to eq('video')

      post :mark_spam, params: { id: pending_review.prefixed_id, moderator_note: 'Spam' }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_response['status']).to eq('spam')
      expect(json_response['spam']).to eq(true)

      post :restore, params: { id: pending_review.prefixed_id, moderator_note: 'False alarm' }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_response['status']).to eq('pending')
      expect(json_response['spam']).to eq(false)

      delete :destroy_media, params: { id: approved_review.prefixed_id, media_id: video_media.id }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_response['media']).to be_empty
      expect(json_response['moderation_audits'].map { |a| a['action'] }).to include('hide', 'unhide', 'media_removed')
    end
  end

  describe 'GET #index with multi-status filter' do
    it 'supports filtering by multiple comma-separated statuses' do
      rejected_review = create(:review, :rejected, product: product, store: store, title: 'Rejected artwork')
      spam_review = create(:review, product: product, store: store, status: 'spam', spam: true, title: 'Buy followers')

      get :index, params: { status: 'approved,rejected' }, as: :json

      expect(response).to have_http_status(:ok)
      returned_ids = json_response['data'].map { |r| r['id'] }
      expect(returned_ids).to match_array([approved_review.prefixed_id, rejected_review.prefixed_id])
      expect(returned_ids).not_to include(pending_review.prefixed_id, spam_review.prefixed_id)
    end
  end

  describe 'POST #bulk' do
    it 'approves, rejects, sets pending, marks spam, hides, and deletes multiple reviews' do
      second_pending = create(:review, product: product, store: store, title: 'Needs check')

      post :bulk, params: { ids: [pending_review.prefixed_id, second_pending.prefixed_id], action_type: 'approve', moderator_note: 'Batch OK' }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_response['data']['count']).to eq(2)
      expect(pending_review.reload.status).to eq('approved')
      expect(second_pending.reload.status).to eq('approved')

      post :bulk, params: { ids: [pending_review.prefixed_id, approved_review.prefixed_id], action_type: 'reject' }, as: :json
      expect(response).to have_http_status(:ok)
      expect(pending_review.reload.status).to eq('rejected')
      expect(approved_review.reload.status).to eq('rejected')

      post :bulk, params: { ids: [pending_review.prefixed_id], action_type: 'pending' }, as: :json
      expect(response).to have_http_status(:ok)
      expect(pending_review.reload.status).to eq('pending')

      post :bulk, params: { ids: [second_pending.prefixed_id], action_type: 'delete' }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_response['data']['count']).to eq(1)
      expect(Spree::Review.find_by(id: second_pending.id)).to be_nil
    end

    it 'returns 422 for unsupported actions or missing ids' do
      post :bulk, params: { ids: [pending_review.prefixed_id], action_type: 'nope' }, as: :json
      expect(response).to have_http_status(:unprocessable_entity)

      post :bulk, params: { ids: [], action_type: 'approve' }, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end


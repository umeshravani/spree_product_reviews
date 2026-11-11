require 'spec_helper'

RSpec.describe 'Storefront reviews enhancement endpoints', type: :controller do
  around do |example|
    saved_config = (Spree::ReviewSetting::ALL_KEYS + [:auto_approve_reviews]).each_with_object({}) do |key, memo|
      memo[key] = SpreeProductReviews::Config[key]
    end
    example.run
  ensure
    saved_config.each { |key, value| SpreeProductReviews::Config[key] = value }
  end

  describe Spree::Api::V3::Store::ReviewSettingsController do
    render_views
    routes { Spree::Core::Engine.routes }
    include_context 'API v3 Store'

    before { request.headers['X-Spree-Api-Key'] = api_key.token }

    it 'returns public store settings including customization and reward config' do
      Spree::ReviewSetting.update_for_store!(store, modal_mode: 'single', photo_reward_text: 'Get 15% off today')

      get :show, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response['data']['modal_mode']).to eq('single')
      expect(json_response['data']['photo_reward_text']).to eq('Get 15% off today')
      expect(json_response['data']).not_to have_key('spam_words')
    end
  end

  describe Spree::Api::V3::Store::ReviewMediaDirectUploadsController do
    render_views
    routes { Spree::Core::Engine.routes }
    include_context 'API v3 Store'

    before { request.headers['X-Spree-Api-Key'] = api_key.token }

    let(:video_blob_params) do
      {
        filename: 'unboxing.mp4',
        byte_size: 2048,
        checksum: Digest::MD5.base64digest('review video'),
        content_type: 'video/mp4'
      }
    end

    it 'creates direct uploads for MP4 video when allow_videos is enabled' do
      Spree::ReviewSetting.update_for_store!(store, allow_videos: true, max_video_size_megabytes: 50)

      post :create, params: { blob: video_blob_params }

      expect(response).to have_http_status(:created)
      expect(json_response['media_type']).to eq('video')
      expect(json_response['signed_id']).to be_present
    end

    it 'rejects video uploads when allow_videos is disabled' do
      Spree::ReviewSetting.update_for_store!(store, allow_videos: false)

      post :create, params: { blob: video_blob_params }

      expect(response).to have_http_status(:bad_request)
      expect(json_response['error']['code']).to eq('parameter_invalid')
    end

    it 'returns 413 payload_too_large when video exceeds max_video_size_megabytes' do
      Spree::ReviewSetting.update_for_store!(store, allow_videos: true, max_video_size_megabytes: 1)

      post :create, params: { blob: video_blob_params.merge(byte_size: 2 * 1024 * 1024) }

      expect(response).to have_http_status(:content_too_large)
      expect(json_response['error']['code']).to eq('request_too_large')
    end
  end

  describe Spree::Api::V3::Store::ReviewReportsController do
    render_views
    routes { Spree::Core::Engine.routes }
    include_context 'API v3 Store'

    let(:product) { create(:product, store: store) }
    let!(:review) { create(:review, :approved, product: product, store: store) }

    before do
      request.headers['X-Spree-Api-Key'] = api_key.token
      Spree::ReviewSetting.update_for_store!(store, report_moderation_threshold: 2)
    end

    it 'records customer abuse reports and auto-hides once threshold is reached' do
      first_user = create(:user)
      allow(controller).to receive(:current_user).and_return(first_user)

      post :create, params: { review_id: review.prefixed_id, reason: 'spam', details: 'Promo text' }
      expect(response).to have_http_status(:created)
      expect(json_response['flagged_count']).to eq(1)
      expect(review.reload.hidden?).to be(false)

      second_user = create(:user)
      allow(controller).to receive(:current_user).and_return(second_user)

      post :create, params: { review_id: review.prefixed_id, reason: 'inappropriate' }
      expect(response).to have_http_status(:created)
      expect(json_response['flagged_count']).to eq(2)
      expect(review.reload).to have_attributes(hidden: true, status: 'hidden')
    end
  end

  describe Spree::Api::V3::Store::ReviewEligibilitiesController do
    render_views
    routes { Spree::Core::Engine.routes }
    include_context 'API v3 Store'

    let(:product) { create(:product, store: store) }
    let(:user) { create(:user, first_name: 'Riya', last_name: 'Kapoor') }
    let!(:existing_review) do
      create(:review, :approved, product: product, store: store, customer: user, title: 'My saved title', body: 'My saved body', rating: 4)
    end

    before do
      request.headers['X-Spree-Api-Key'] = api_key.token
      Spree::ReviewSetting.update_for_store!(store, allow_unverified: true)
      allow(controller).to receive(:current_user).and_return(user)
    end

    it 'returns existing_review details for prefilling Update review modal' do
      get :show, params: { product_id: product.prefixed_id }

      expect(response).to have_http_status(:ok)
      expect(json_response['already_reviewed']).to be(true)
      expect(json_response['review_id']).to eq(existing_review.prefixed_id)
      expect(json_response['existing_review']['title']).to eq('My saved title')
      expect(json_response['existing_review']['body']).to eq('My saved body')
      expect(json_response['existing_review']['rating']).to eq(4)
    end
  end

  describe Spree::Api::V3::Store::ReviewsController do
    render_views
    routes { Spree::Core::Engine.routes }
    include_context 'API v3 Store'

    let(:product) { create(:product, store: store) }
    let(:user) { create(:user, first_name: 'Karan', last_name: 'Mehta') }
    let!(:existing_review) do
      create(:review, :approved, product: product, store: store, customer: user, title: 'Initial headline', body: 'Initial review body', rating: 4)
    end

    before do
      request.headers['X-Spree-Api-Key'] = api_key.token
      allow(controller).to receive(:current_user).and_return(user)
    end

    it 'enforces granular edit permissions and supports removing/adding attachments on update' do
      media = create(:review_media, review: existing_review, position: 0)
      Spree::ReviewSetting.update_for_store!(
        store,
        allow_edit_rating: false,
        allow_edit_title: true,
        allow_edit_body: true,
        allow_edit_remove_media: true,
        allow_edit_add_media: true
      )

      patch :update, params: { product_id: product.prefixed_id, id: existing_review.prefixed_id, rating: 1 }
      expect(response).to have_http_status(:unprocessable_content)
      expect(existing_review.reload.rating).to eq(4)

      new_blob = ActiveStorage::Blob.create_and_upload!(
        io: StringIO.new('replacement image'),
        filename: 'replacement.jpg',
        content_type: 'image/jpeg'
      )

      patch :update, params: {
        product_id: product.prefixed_id,
        id: existing_review.prefixed_id,
        title: 'Updated headline',
        body: 'Updated review content',
        remove_media_ids: [media.prefixed_id],
        images: [{ signed_id: new_blob.signed_id, alt: 'Updated photo' }]
      }

      expect(response).to have_http_status(:ok)
      existing_review.reload
      expect(existing_review.title).to eq('Updated headline')
      expect(existing_review.body).to eq('Updated review content')
      expect(existing_review.review_media.count).to eq(1)
      expect(existing_review.review_media.first.attachment.filename.to_s).to eq('replacement.jpg')
    end
  end
end

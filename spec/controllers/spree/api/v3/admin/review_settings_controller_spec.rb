require 'spec_helper'

RSpec.describe Spree::Api::V3::Admin::ReviewSettingsController, type: :controller do
  render_views
  routes { Spree::Core::Engine.routes }

  include_context 'API v3 Admin authenticated'

  around do |example|
    saved_config = (Spree::ReviewSetting::ALL_KEYS + [:auto_approve_reviews]).each_with_object({}) do |key, memo|
      memo[key] = SpreeProductReviews::Config[key]
    end
    example.run
  ensure
    saved_config.each { |key, value| SpreeProductReviews::Config[key] = value }
  end

  before { request.headers.merge!(headers) }

  describe 'GET #show' do
    it 'returns current store review settings' do
      get :show, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response['data']['enabled']).to eq(true)
      expect(json_response['data']['modal_mode']).to eq('multi')
      expect(json_response['data']['allow_videos']).to eq(true)
      expect(json_response['data']['title_star_color']).to eq('#FBBF24')
      expect(json_response['data']['product_card_star_color']).to eq('#FBBF24')
      expect(json_response['data']['verified_badge_color']).to eq('#000000')
    end
  end

  describe 'PATCH #update' do
    it 'updates per-store settings across General, Settings, and Customisation tabs' do
      patch :update,
            params: {
              settings: {
                allow_unverified: true,
                allow_anonymous: true,
                allow_videos: true,
                modal_mode: 'single',
                single_form_title: 'Tell shoppers what you think',
                photo_reward_percentage: 12,
                photo_reward_amount: 120.0,
                video_reward_percentage: 25,
                video_reward_amount: 250.0,
                title_star_color: '#1D4ED8',
                bottom_star_color: '#F59E0B',
                product_card_star_color: '#EAB308',
                verified_badge_color: '#1D9BF0'
              }
            },
            as: :json

      expect(response).to have_http_status(:ok)
      data = json_response['data']
      expect(data['allow_unverified']).to eq(true)
      expect(data['allow_anonymous']).to eq(true)
      expect(data['modal_mode']).to eq('single')
      expect(data['single_form_title']).to eq('Tell shoppers what you think')
      expect(data['photo_reward_percentage']).to eq(12)
      expect(data['video_reward_amount']).to eq(250.0)
      expect(data['title_star_color']).to eq('#1D4ED8')
      expect(data['bottom_star_color']).to eq('#F59E0B')
      expect(data['product_card_star_color']).to eq('#EAB308')
      expect(data['verified_badge_color']).to eq('#1D9BF0')

      persisted = Spree::ReviewSetting.for_store(store)
      expect(persisted[:modal_mode]).to eq('single')
      expect(persisted[:video_reward_amount]).to eq(250.0)
      expect(persisted[:product_card_star_color]).to eq('#EAB308')
      expect(persisted[:verified_badge_color]).to eq('#1D9BF0')
    end
  end
end


require 'spec_helper'

RSpec.describe Spree::ReviewSetting, type: :model do
  let(:store) { Spree::Store.default.persisted? ? Spree::Store.default : create(:store, default: true) }
  let(:other_store) { create(:store) }

  around do |example|
    saved_config = (Spree::ReviewSetting::ALL_KEYS + [:auto_approve_reviews]).each_with_object({}) do |key, memo|
      memo[key] = SpreeProductReviews::Config[key]
    end
    example.run
  ensure
    saved_config.each { |key, value| SpreeProductReviews::Config[key] = value }
  end

  describe '.for_store' do
    it 'returns defaults with compatibility aliases' do
      settings = described_class.for_store(store)

      expect(settings[:enabled]).to eq(true)
      expect(settings[:require_approval]).to eq(true)
      expect(settings[:allow_videos]).to eq(true)
      expect(settings[:modal_mode]).to eq('multi')
      expect(settings[:max_images_upload]).to eq(settings[:max_images_per_review])
      expect(settings[:max_image_size_mb]).to eq(settings[:max_image_size_megabytes])
      expect(settings[:max_video_size_mb]).to eq(settings[:max_video_size_megabytes])
      expect(settings[:auto_approve_reviews]).to eq(false)
    end
  end

  describe '.update_for_store!' do
    it 'persists settings per store cleanly without polluting other stores' do
      described_class.update_for_store!(
        store,
        modal_mode: 'single',
        allow_unverified: true,
        allow_anonymous: true,
        video_reward_amount: '250.5',
        photo_reward_percentage: '18',
        title_star_color: '#111827',
        bottom_star_color: '#F59E0B'
      )

      updated = described_class.for_store(store)
      expect(updated[:modal_mode]).to eq('single')
      expect(updated[:allow_unverified]).to eq(true)
      expect(updated[:allow_anonymous]).to eq(true)
      expect(updated[:video_reward_amount]).to eq(250.5)
      expect(updated[:photo_reward_percentage]).to eq(18)
      expect(updated[:title_star_color]).to eq('#111827')
      expect(updated[:bottom_star_color]).to eq('#F59E0B')

      other = described_class.for_store(other_store)
      expect(other[:modal_mode]).to eq('multi')
    end

    it 'maps legacy auto_approve_reviews alias to require_approval' do
      described_class.update_for_store!(store, auto_approve_reviews: true)

      updated = described_class.for_store(store)
      expect(updated[:require_approval]).to eq(false)
      expect(updated[:auto_approve_reviews]).to eq(true)
    end
  end

  describe '.public_hash' do
    it 'includes public display & reward settings while excluding internal spam configuration' do
      pub = described_class.public_hash(store)

      expect(pub).to have_key(:modal_mode)
      expect(pub).to have_key(:photo_reward_text)
      expect(pub).to have_key(:video_reward_text)
      expect(pub).to have_key(:title_star_color)
      expect(pub).not_to have_key(:spam_words)
      expect(pub).not_to have_key(:customer_rate_limit_per_hour)
      expect(pub).not_to have_key(:ip_rate_limit_per_hour)
    end
  end
end


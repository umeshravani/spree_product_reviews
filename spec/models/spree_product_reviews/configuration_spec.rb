# frozen_string_literal: true

require 'spec_helper'
require_relative '../../../lib/spree_product_reviews/configuration'
require_relative '../../../lib/spree_product_reviews/version'

module SpreeProductReviews
  class << self
    def configuration
      @configuration ||= Configuration.new
    end
    alias config configuration

    def configure
      yield(configuration)
    end
  end
end

RSpec.describe SpreeProductReviews::Configuration do
  let(:config) { described_class.new }

  describe 'default values' do
    it 'enables reviews by default' do
      expect(config.enabled).to be true
    end

    it 'requires approval by default' do
      expect(config.require_approval).to be true
    end

    it 'sets default review status to pending' do
      expect(config.review_status_default).to eq('pending')
    end

    it 'disallows anonymous reviews by default' do
      expect(config.allow_anonymous).to be false
    end

    it 'allows unverified reviews by default' do
      expect(config.allow_unverified).to be true
    end

    it 'defaults max images to 5' do
      expect(config.max_images_upload).to eq(5)
    end

    it 'defaults max image size to 5MB' do
      expect(config.max_image_size_mb).to eq(5)
    end

    it 'blocks spam reviews by default' do
      expect(config.block_spam_reviews).to be true
    end

    it 'disables review links by default' do
      expect(config.disable_review_links).to be true
    end

    it 'defaults customer rate limit to 5 per hour' do
      expect(config.customer_rate_limit_per_hour).to eq(5)
    end

    it 'defaults ip rate limit to 10 per hour' do
      expect(config.ip_rate_limit_per_hour).to eq(10)
    end

    it 'defaults report moderation threshold to 3' do
      expect(config.report_moderation_threshold).to eq(3)
    end

    it 'defaults reviews per product limit to one_per_customer' do
      expect(config.reviews_per_product_limit).to eq('one_per_customer')
    end

    it 'defaults anonymize_ips to true' do
      expect(config.anonymize_ips).to be true
    end

    it 'defaults duplicate detection window to 24 hours' do
      expect(config.duplicate_detection_window_hours).to eq(24)
    end

    it 'defaults modal_mode to multi' do
      expect(config.modal_mode).to eq('multi')
    end

    it 'defaults rewards_enabled to true' do
      expect(config.rewards_enabled).to be true
    end

    it 'defaults photo rewards settings' do
      expect(config.photo_reward_enabled).to be true
      expect(config.photo_reward_percentage).to eq(15)
      expect(config.photo_reward_amount).to eq(150.0)
      expect(config.photo_reward_text).to eq('Get 15% off your next purchase')
    end

    it 'defaults video rewards settings' do
      expect(config.video_reward_enabled).to be true
      expect(config.video_reward_percentage).to eq(20)
      expect(config.video_reward_amount).to eq(200.0)
      expect(config.video_reward_text).to eq('Get 20% off your next purchase')
    end

    it 'defaults multi-step wizard titles and labels' do
      expect(config.step1_title).to eq('How would you rate this item?')
      expect(config.step1_dislike_label).to eq('Dislike it')
      expect(config.step1_love_label).to eq('Love it!')
      expect(config.step2_title).to eq('Show it off')
      expect(config.step2_subtitle).to eq("We'd love to see it in action!")
      expect(config.step3_title).to eq('Tell us more!')
      expect(config.step3_placeholder).to eq('Share your experience')
      expect(config.step4_title).to eq('Thank you for posting!')
      expect(config.step4_subtitle).to eq('Your feedback helps others make better choices.')
    end

    it 'defaults title rating header presentation' do
      expect(config.title_star_color).to eq('#000000')
      expect(config.title_rating_format).to eq('{rating}/5 {count}+ reviews')
      expect(config.title_reviews_label).to eq('reviews')
    end
  end

  describe 'configure block' do
    it 'allows customizing settings' do
      SpreeProductReviews.configure do |c|
        c.enabled = false
        c.max_images_upload = 10
        c.spam_words = 'buy,cheap,viagra'
      end

      expect(SpreeProductReviews.config.enabled).to be false
      expect(SpreeProductReviews.config.max_images_upload).to eq(10)
      expect(SpreeProductReviews.config.spam_words).to eq('buy,cheap,viagra')

      # Restore defaults
      SpreeProductReviews.configure do |c|
        c.enabled = true
        c.max_images_upload = 5
        c.spam_words = ''
      end
    end
  end
end

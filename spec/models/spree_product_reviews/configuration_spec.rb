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

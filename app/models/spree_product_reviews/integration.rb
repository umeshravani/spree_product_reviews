# frozen_string_literal: true

module SpreeProductReviews
  class Integration < (defined?(Spree::Integration) ? Spree::Integration : Object)
    if defined?(Spree::Integration)
      preference :enabled, :boolean, default: true
      preference :require_approval, :boolean, default: true
      preference :allow_anonymous, :boolean, default: false
      preference :allow_unverified, :boolean, default: true
      preference :block_spam_reviews, :boolean, default: true
      preference :disable_review_links, :boolean, default: true
      preference :spam_words, :string, default: ''
      preference :max_images_upload, :integer, default: 5
      preference :report_moderation_threshold, :integer, default: 3

      def self.integration_group
        'marketing'
      end

      def self.display_name
        'Product Reviews & Ratings'
      end

      def can_connect?
        true
      end
    end
  end
end

# frozen_string_literal: true

module SpreeProductReviews
  class Configuration < (defined?(Spree::Preferences::Configuration) ? Spree::Preferences::Configuration : Object)
    if defined?(Spree::Preferences::Configuration)
      preference :enabled, :boolean, default: true
      preference :require_approval, :boolean, default: true
      preference :review_status_default, :string, default: 'pending'
      preference :allow_anonymous, :boolean, default: false
      preference :allow_unverified, :boolean, default: true
      preference :max_images_upload, :integer, default: 5
      preference :max_image_size_mb, :integer, default: 5
      preference :block_spam_reviews, :boolean, default: true
      preference :disable_review_links, :boolean, default: true
      preference :spam_words, :string, default: ''
    else
      attr_accessor :enabled, :require_approval, :review_status_default,
                    :allow_anonymous, :allow_unverified, :max_images_upload,
                    :max_image_size_mb, :block_spam_reviews, :disable_review_links,
                    :spam_words

      def initialize
        @enabled = true
        @require_approval = true
        @review_status_default = 'pending'
        @allow_anonymous = false
        @allow_unverified = true
        @max_images_upload = 5
        @max_image_size_mb = 5
        @block_spam_reviews = true
        @disable_review_links = true
        @spam_words = ''
      end
    end
  end
end

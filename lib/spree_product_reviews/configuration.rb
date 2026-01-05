module SpreeProductReviews
  class Configuration < Spree::Preferences::Configuration
    preference :review_status_default, :string, default: 'pending'
    preference :block_spam_reviews, :boolean, default: false
    preference :disable_review_links, :boolean, default: false
    preference :disable_review_emails, :boolean, default: false
  end
end

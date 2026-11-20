module Spree
  class ReviewNotifications
    def self.deliver(event, review, **args)
      return if review.blank? || review.store.blank?

      store = review.store
      settings = Spree::ReviewSetting.for_store(store)
      return unless settings[:send_review_emails_to_customers]

      recipient = review.recipient_email
      return if recipient.blank?

      case event.to_sym
      when :posted
        return unless settings[:send_review_posted_email]
        Spree::ProductReviewMailer.review_posted_email(review).deliver_later
      when :approved
        return unless settings[:send_review_approved_email]
        Spree::ProductReviewMailer.review_approved_email(review).deliver_later
      when :rejected
        return unless settings[:send_review_rejected_email]
        Spree::ProductReviewMailer.review_rejected_email(review).deliver_later
      when :spam
        return unless settings[:send_review_spam_email]
        Spree::ProductReviewMailer.review_spam_email(review).deliver_later
      when :deleted
        return unless settings[:send_review_deleted_email]
        Spree::ProductReviewMailer.review_deleted_email(review).deliver_later
      end
    rescue StandardError => e
      Rails.logger.error("[SpreeProductReviews] Email delivery failed for #{event}: #{e.message}")
    end

    def self.solicit(customer_or_email, product, store)
      return if customer_or_email.blank? || product.blank? || store.blank?

      settings = Spree::ReviewSetting.for_store(store)
      return unless settings[:send_review_emails_to_customers] && settings[:send_solicit_review_email]

      Spree::ProductReviewMailer.solicit_review_email(customer_or_email, product, store).deliver_later
    rescue StandardError => e
      Rails.logger.error("[SpreeProductReviews] Solicit review email failed: #{e.message}")
    end
  end
end

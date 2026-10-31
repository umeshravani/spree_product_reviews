# frozen_string_literal: true

module Spree
  class ReviewReport < (defined?(Spree.base_class) ? Spree.base_class : (defined?(Spree::Base) ? Spree::Base : ActiveRecord::Base))
    self.table_name = 'spree_review_reports'

    REASONS = %w[spam harassment inappropriate misleading other].freeze
    STATUSES = %w[pending reviewed dismissed].freeze

    belongs_to :review, class_name: 'Spree::ProductReview'
    belongs_to :customer, class_name: (defined?(Spree.customer_class) && Spree.customer_class ? Spree.customer_class.to_s : 'Spree::Customer'), optional: true

    validates :reason, presence: true, inclusion: { in: REASONS }
    validates :details, length: { maximum: 1000 }
    validates :status, inclusion: { in: STATUSES }
    validates :customer_id, uniqueness: { scope: :review_id, message: 'You have already reported this review' }, if: -> { customer_id.present? }
    validates :ip_hash, uniqueness: { scope: :review_id, message: 'This network has already reported this review' }, if: -> { customer_id.blank? && ip_hash.present? }

    scope :pending, -> { where(status: 'pending') }
    scope :reviewed, -> { where(status: 'reviewed') }
    scope :dismissed, -> { where(status: 'dismissed') }
    scope :newest, -> { order(created_at: :desc) }

    after_create :increment_review_flagged_count

    def dismiss!(moderator: nil, note: nil)
      update!(
        status: 'dismissed',
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
    end

    def resolve!(moderator: nil, note: nil)
      update!(
        status: 'reviewed',
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
    end

    private

    def increment_review_flagged_count
      return unless review

      review.with_lock do
        # Count DISTINCT unique reporters (customers or IP hashes) among non-dismissed reports
        unique_customers = review.reports.where.not(status: 'dismissed').where.not(customer_id: nil).distinct.count(:customer_id)
        unique_ips = review.reports.where.not(status: 'dismissed').where(customer_id: nil).where.not(ip_hash: nil).distinct.count(:ip_hash)
        unique_reporters_count = unique_customers + unique_ips

        review.update_columns(flagged_count: unique_reporters_count)

        threshold = begin
                      SpreeProductReviews.config.report_moderation_threshold
                    rescue StandardError
                      3
                    end
        threshold = 3 if threshold.nil? || threshold <= 0

        # Anti-brigading and authenticity safeguards:
        # Prevent coordinated smear campaigns from taking down legitimate reviews.
        # Reviews that are verified purchases or have established helpfulness are flagged with priority
        # for human staff review rather than being automatically suppressed.
        is_verified = review.verified_purchaser?
        has_high_reputation = (review.helpful_count || 0) >= 3

        if unique_reporters_count >= threshold && review.approved?
          if is_verified || has_high_reputation
            # Retain live but flag for priority review in the moderation queue
            review.record_audit!(
              action: :flagged_priority_review,
              moderator: 'System',
              note: "Flagged by #{unique_reporters_count} unique reporters. Retained live due to verified purchaser / high reputation safeguard pending human review."
            )
          else
            # Unverified or low-reputation review: auto-hide pending moderation
            review.update_columns(approved: false, hidden: true)
            review.record_audit!(
              action: :auto_flagged,
              moderator: 'System',
              note: "Automatically hidden after reaching report threshold (#{unique_reporters_count} distinct reporters)"
            )
            review.recalculate_product_rating
          end
        end
      end
    rescue StandardError => e
      Rails.logger.error("[SpreeProductReviews] Error updating report count: #{e.message}")
    end

    def moderator_display_name(moderator)
      return 'System' if moderator.nil?
      return moderator.name if moderator.respond_to?(:name) && moderator.name.present?
      return moderator.email if moderator.respond_to?(:email) && moderator.email.present?
      return "User##{moderator.id}" if moderator.respond_to?(:id)

      moderator.to_s
    end
  end
end


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
        new_count = (review.flagged_count || 0) + 1
        review.update_columns(flagged_count: new_count)

        threshold = begin
                      SpreeProductReviews.config.report_moderation_threshold
                    rescue StandardError
                      3
                    end
        threshold = 3 if threshold.nil? || threshold <= 0

        # If flagged count exceeds threshold and review is approved, auto-unapprove for moderation
        if new_count >= threshold && review.approved?
          review.update_columns(approved: false, hidden: true)
          review.record_audit!(
            action: :auto_flagged,
            moderator: 'System',
            note: "Automatically hidden after reaching report threshold (#{new_count} reports)"
          )
          review.recalculate_product_rating
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

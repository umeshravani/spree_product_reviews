module Spree
  class ReviewReport < Spree.base_class
    self.table_name = 'spree_review_reports'

    has_prefix_id :rrep

    REASONS = %w[spam inappropriate misleading off_topic abusive other].freeze

    belongs_to :review, class_name: 'Spree::Review', inverse_of: :reports
    belongs_to :customer, class_name: Spree.customer_class.to_s, optional: true

    validates :review, presence: true
    validates :reason, presence: true
    validate :prevent_duplicate_report, on: :create

    after_create :increment_review_flagged_count!

    private

    def prevent_duplicate_report
      return if review.blank?

      if customer_id.present?
        if review.reports.where(customer_id: customer_id).exists?
          errors.add(:base, 'You have already reported this review.')
        end
      elsif ip_hash.present? && review.reports.where(ip_hash: ip_hash).exists?
        errors.add(:base, 'This review has already been reported from your network.')
      end
    end

    def increment_review_flagged_count!
      review.with_lock do
        new_count = review.reports.count
        threshold = Spree::ReviewSetting.for_store(review.store)[:report_moderation_threshold].to_i
        threshold = 3 if threshold <= 0

        updates = { flagged_count: new_count }
        if new_count >= threshold && review.status == 'approved' && !review.hidden?
          updates[:hidden] = true
          updates[:status] = 'hidden'
          updates[:moderated_at] = Time.current
          updates[:moderator_name] = 'System (Report Threshold)'
          updates[:moderator_note] = "Auto-hidden after reaching #{new_count} customer reports."
          review.update_columns(updates)
          review.record_audit!(action: :auto_hidden, note: updates[:moderator_note])
          review.recalculate_summary_safely!
        else
          review.update_column(:flagged_count, new_count)
        end
      end
    end
  end
end

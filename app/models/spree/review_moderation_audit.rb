module Spree
  class ReviewModerationAudit < Spree.base_class
    self.table_name = 'spree_review_moderation_audits'

    has_prefix_id :rmod

    belongs_to :review, class_name: 'Spree::Review', inverse_of: :moderation_audits

    validates :review, presence: true
    validates :action, presence: true

    scope :recent_first, -> { order(created_at: :desc, id: :desc) }
  end
end


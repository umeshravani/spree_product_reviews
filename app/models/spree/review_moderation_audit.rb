# frozen_string_literal: true

module Spree
  class ReviewModerationAudit < (defined?(Spree.base_class) ? Spree.base_class : (defined?(Spree::Base) ? Spree::Base : ActiveRecord::Base))
    self.table_name = 'spree_review_moderation_audits'

    belongs_to :review, class_name: 'Spree::ProductReview'
    belongs_to :moderator, polymorphic: true, optional: true

    ACTIONS = %w[
      approve
      reject
      mark_spam
      restore_from_spam
      hide
      unhide
      remove_image
      soft_delete
      restore
      edit
      withdraw
    ].freeze

    validates :review, presence: true
    validates :action, presence: true, inclusion: { in: ACTIONS }

    scope :chronological, -> { order(created_at: :desc) }
  end
end

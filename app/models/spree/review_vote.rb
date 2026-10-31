# frozen_string_literal: true

module Spree
  class ReviewVote < (defined?(Spree.base_class) ? Spree.base_class : (defined?(Spree::Base) ? Spree::Base : ActiveRecord::Base))
    self.table_name = 'spree_review_votes'

    belongs_to :review, class_name: 'Spree::ProductReview'
    belongs_to :customer, class_name: (defined?(Spree.customer_class) && Spree.customer_class ? Spree.customer_class.to_s : 'Spree::Customer'), optional: true
    belongs_to :user, class_name: (defined?(Spree.user_class) && Spree.user_class ? Spree.user_class.to_s : 'Spree::User'), optional: true

    validates :review, presence: true
    validates :helpful, inclusion: { in: [true, false] }
    validate :validate_voter_presence
    validate :validate_unique_vote, on: :create

    after_save :update_review_counts
    after_destroy :update_review_counts

    private

    def validate_voter_presence
      if customer_id.blank? && user_id.blank? && ip_address.blank?
        errors.add(:base, 'Voter identification (customer or IP address) required')
      end
    end

    def validate_unique_vote
      scope = self.class.where(review_id: review_id)
      if customer_id.present?
        errors.add(:customer_id, 'has already voted on this review') if scope.where(customer_id: customer_id).exists?
      elsif user_id.present?
        errors.add(:user_id, 'has already voted on this review') if scope.where(user_id: user_id).exists?
      elsif ip_address.present?
        errors.add(:ip_address, 'has already voted on this review from this IP') if scope.where(ip_address: ip_address).exists?
      end
    end

    def update_review_counts
      return unless review

      review.update_columns(
        helpful_count: review.votes.where(helpful: true).count,
        unhelpful_count: review.votes.where(helpful: false).count
      )
    end
  end
end

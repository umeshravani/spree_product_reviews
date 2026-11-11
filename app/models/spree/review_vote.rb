module Spree
  class ReviewVote < Spree.base_class
    has_prefix_id :revvote

    VOTES = %w[helpful not_helpful].freeze

    belongs_to :review, class_name: 'Spree::Review', inverse_of: :votes, touch: true
    belongs_to :customer, class_name: Spree.customer_class.to_s, optional: true

    validates :review, :vote, presence: true
    validates :vote, inclusion: { in: VOTES }
    validate :user_or_ip_address_present
    validate :single_vote_per_actor

    scope :helpful, -> { where(vote: 'helpful') }
    scope :not_helpful, -> { where(vote: 'not_helpful') }

    after_commit :recalculate_review_vote_counts

    private

    def user_or_ip_address_present
      return if customer_id.present? || ip_address.present?

      errors.add(:base, :blank)
    end

    def single_vote_per_actor
      return if review_id.blank?

      existing = self.class.where(review_id: review_id)
      existing = existing.where.not(id: id) if persisted?
      existing = if customer_id.present?
                   existing.where(customer_id: customer_id)
                 else
                   existing.where(ip_address: ip_address)
                 end

      errors.add(:base, :taken) if existing.exists?
    end

    def recalculate_review_vote_counts
      review&.recalculate_vote_counts!
    end
  end
end

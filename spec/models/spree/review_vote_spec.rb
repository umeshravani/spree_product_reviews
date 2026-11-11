require 'spec_helper'

RSpec.describe Spree::ReviewVote, type: :model do
  describe 'validations' do
    it 'requires either a user or an ip address' do
      vote = build(:review_vote, customer: nil, ip_address: nil)

      expect(vote).not_to be_valid
      expect(vote.errors[:base]).to be_present
    end

    it 'prevents the same user from voting twice on a review' do
      user = create(:user)
      review = create(:review, :approved)
      create(:review_vote, :with_customer, review: review, customer: user)

      duplicate_vote = build(:review_vote, :with_customer, review: review, customer: user)

      expect(duplicate_vote).not_to be_valid
      expect(duplicate_vote.errors[:base]).to be_present
    end
  end

  describe 'counter cache recalculation' do
    it 'updates helpful and not helpful counters after voting' do
      review = create(:review, :approved)

      create(:review_vote, review: review, vote: 'helpful', ip_address: '127.0.0.1')
      create(:review_vote, :not_helpful, review: review, ip_address: '127.0.0.2')

      expect(review.reload.helpful_count).to eq(1)
      expect(review.not_helpful_count).to eq(1)
    end
  end
end

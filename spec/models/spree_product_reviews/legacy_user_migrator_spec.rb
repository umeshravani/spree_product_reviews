# frozen_string_literal: true

require 'spec_helper'
require 'ostruct'
require_relative '../../../lib/spree_product_reviews/legacy_user_migrator'

RSpec.describe SpreeProductReviews::LegacyUserMigrator do
  let(:mock_review_class) do
    Class.new do
      attr_accessor :id, :user_id, :customer_id

      def initialize(id, user_id, customer_id = nil)
        @id = id
        @user_id = user_id
        @customer_id = customer_id
      end

      def update_columns(attrs)
        @customer_id = attrs[:customer_id] if attrs.key?(:customer_id)
      end
    end
  end

  describe 'Deterministic Mapping Algorithm' do
    let(:legacy_users) do
      {
        10 => { id: 10, email: 'ALICE@example.com' },
        20 => { id: 20, email: 'charlie@example.com' },
        30 => { id: 30, email: '' }
      }
    end

    let(:spree6_customers) do
      {
        10 => { id: 10, email: 'bob@example.com' }, # Deliberately different user with ID 10
        42 => { id: 42, email: 'alice@example.com' } # Alice has ID 42 in Spree 6!
      }
    end

    def simulate_migration(reviews, dry_run: false)
      mapped = 0
      unmatched = 0
      unmatched_details = []

      reviews.each do |review|
        user = legacy_users[review.user_id]
        if user.nil? || user[:email].blank?
          unmatched += 1
          unmatched_details << { review_id: review.id, user_id: review.user_id, reason: 'Legacy user not found or email blank' }
          next
        end

        normalized_email = user[:email].strip.downcase
        matched_customer = spree6_customers.values.find { |c| c[:email].strip.downcase == normalized_email }

        if matched_customer
          review.update_columns(customer_id: matched_customer[:id]) unless dry_run
          mapped += 1
        else
          unmatched += 1
          unmatched_details << { review_id: review.id, user_id: review.user_id, email: normalized_email, reason: 'No matching customer' }
        end
      end

      { mapped: mapped, unmatched: unmatched, unmatched_details: unmatched_details }
    end

    it 'maps legacy user to customer by email when IDs differ (does not blindly copy user_id)' do
      # Review created by legacy user 10 (Alice)
      review = mock_review_class.new(1, 10, nil)

      result = simulate_migration([review])

      expect(result[:mapped]).to eq(1)
      expect(result[:unmatched]).to eq(0)
      # Must be mapped to Customer 42 (Alice), NOT Customer 10 (Bob)!
      expect(review.customer_id).to eq(42)
      expect(review.user_id).to eq(10)
    end

    it 'preserves original user_id and leaves customer_id nil when no matching customer exists' do
      # Review created by legacy user 20 (Charlie)
      review = mock_review_class.new(2, 20, nil)

      result = simulate_migration([review])

      expect(result[:mapped]).to eq(0)
      expect(result[:unmatched]).to eq(1)
      expect(review.customer_id).to be_nil
      expect(review.user_id).to eq(20)
      expect(result[:unmatched_details].first[:user_id]).to eq(20)
      expect(result[:unmatched_details].first[:email]).to eq('charlie@example.com')
    end

    it 'handles missing or blank email legacy users safely' do
      review_blank = mock_review_class.new(3, 30, nil)
      review_nonexistent = mock_review_class.new(4, 999, nil)

      result = simulate_migration([review_blank, review_nonexistent])

      expect(result[:mapped]).to eq(0)
      expect(result[:unmatched]).to eq(2)
      expect(review_blank.customer_id).to be_nil
      expect(review_nonexistent.customer_id).to be_nil
    end

    it 'honors dry_run mode without modifying records' do
      review = mock_review_class.new(1, 10, nil)

      result = simulate_migration([review], dry_run: true)

      expect(result[:mapped]).to eq(1)
      # In dry run, customer_id is not mutated
      expect(review.customer_id).to be_nil
    end
  end
end


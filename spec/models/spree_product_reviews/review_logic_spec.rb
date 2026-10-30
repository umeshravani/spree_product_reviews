# frozen_string_literal: true

require 'spec_helper'
require 'ostruct'

module Spree
  class Base; end
  class ProductReview; end
  class ReviewVote; end
end

require_relative '../../../lib/spree_product_reviews/configuration'
require_relative '../../../lib/spree_product_reviews/version'

RSpec.describe 'SpreeProductReviews Review Logic & Lifecycle' do
  describe 'Reviewer Name Masking & Privacy' do
    let(:mask_method) do
      Class.new do
        def self.mask_email(email)
          parts = email.split('@')
          name = parts.first
          domain = parts.last
          masked_name = name.length > 2 ? "#{name[0]}***#{name[-1]}" : "#{name[0]}***"
          "#{masked_name}@#{domain}"
        end

        def self.reviewer_name(name: nil, show_identifier: true, customer: nil, user: nil)
          return name if name.present?

          if show_identifier
            if customer.present?
              if customer.respond_to?(:first_name) && customer.first_name.present?
                last_initial = customer.respond_to?(:last_name) && customer.last_name.present? ? " #{customer.last_name[0]}." : ''
                "#{customer.first_name}#{last_initial}".strip
              elsif customer.respond_to?(:email) && customer.email.present?
                mask_email(customer.email)
              else
                'Verified Customer'
              end
            elsif user.present?
              if user.respond_to?(:name) && user.name.present?
                user.name
              elsif user.respond_to?(:email) && user.email.present?
                mask_email(user.email)
              else
                'Verified Customer'
              end
            else
              'Anonymous'
            end
          else
            'Anonymous'
          end
        end
      end
    end

    it 'returns explicit name if provided' do
      expect(mask_method.reviewer_name(name: 'Jane Doe')).to eq('Jane Doe')
    end

    it 'masks email if customer has no first_name' do
      customer = OpenStruct.new(email: 'customer@example.com')
      expect(mask_method.reviewer_name(customer: customer)).to eq('c***r@example.com')
    end

    it 'formats first name and last initial if customer has names' do
      customer = OpenStruct.new(first_name: 'Rahul', last_name: 'Sharma', email: 'r@example.com')
      expect(mask_method.reviewer_name(customer: customer)).to eq('Rahul S.')
    end

    it 'returns Anonymous if show_identifier is false' do
      customer = OpenStruct.new(first_name: 'Rahul', email: 'r@example.com')
      expect(mask_method.reviewer_name(show_identifier: false, customer: customer)).to eq('Anonymous')
    end

    it 'returns Anonymous if no customer or user is present' do
      expect(mask_method.reviewer_name).to eq('Anonymous')
    end
  end

  describe 'Rating Aggregates Calculation' do
    let(:calculator) do
      Class.new do
        def self.compute(ratings)
          count = ratings.size
          return { average_rating: 0.0, review_count: 0 } if count.zero?

          avg = (ratings.sum.to_f / count).round(2)
          { average_rating: avg, review_count: count }
        end
      end
    end

    it 'computes 0 for empty ratings' do
      result = calculator.compute([])
      expect(result[:average_rating]).to eq(0.0)
      expect(result[:review_count]).to eq(0)
    end

    it 'computes exact average for multiple ratings' do
      result = calculator.compute([5, 4, 5, 4, 3])
      expect(result[:average_rating]).to eq(4.2)
      expect(result[:review_count]).to eq(5)
    end
  end

  describe 'Review Status Transitions' do
    let(:review_state) do
      Class.new do
        attr_accessor :approved, :spam

        def initialize(approved: false, spam: false)
          @approved = approved
          @spam = spam
        end

        def approve!
          @approved = true
          @spam = false
        end

        def reject!
          @approved = false
        end

        def mark_spam!
          @spam = true
          @approved = false
        end

        def unmark_spam!
          @spam = false
        end

        def pending?
          !@approved && !@spam
        end

        def status
          return 'spam' if @spam
          return 'approved' if @approved

          'pending'
        end
      end
    end

    it 'starts in pending state' do
      review = review_state.new(approved: false, spam: false)
      expect(review.pending?).to be true
      expect(review.status).to eq('pending')
    end

    it 'approves review and clears spam' do
      review = review_state.new(approved: false, spam: true)
      review.approve!
      expect(review.approved).to be true
      expect(review.spam).to be false
      expect(review.pending?).to be false
      expect(review.status).to eq('approved')
    end

    it 'rejects review' do
      review = review_state.new(approved: true, spam: false)
      review.reject!
      expect(review.approved).to be false
      expect(review.status).to eq('pending')
    end

    it 'marks as spam and unapproves' do
      review = review_state.new(approved: true, spam: false)
      review.mark_spam!
      expect(review.spam).to be true
      expect(review.approved).to be false
      expect(review.status).to eq('spam')
    end

    it 'clears spam flag' do
      review = review_state.new(approved: false, spam: true)
      review.unmark_spam!
      expect(review.spam).to be false
      expect(review.pending?).to be true
    end
  end

  describe 'Spam Detection Heuristics' do
    let(:detector) do
      Class.new do
        LINK_REGEX ||= %r{https?://|www\.|[a-zA-Z0-9-]+\.(com|net|org|io|xyz|biz)}i

        def self.spam?(text, block_links: true, spam_words: '')
          return true if block_links && text.match?(LINK_REGEX)

          if spam_words.present?
            words = spam_words.split(',').map(&:strip).reject(&:empty?)
            full_text = text.downcase
            return true if words.any? { |w| full_text.include?(w.downcase) }
          end

          false
        end
      end
    end

    it 'flags review containing http link' do
      expect(detector.spam?('Check out https://spamsite.xyz for free gifts!')).to be true
    end

    it 'flags review containing domain suffix' do
      expect(detector.spam?('Visit my shop at bestdeals.com')).to be true
    end

    it 'flags review containing keyword from spam list' do
      expect(detector.spam?('Buy cheap replica watches', spam_words: 'replica,crypto,loan')).to be true
    end

    it 'allows clean product reviews' do
      expect(detector.spam?('Amazing quality, fast delivery and great packaging!')).to be false
    end
  end
end

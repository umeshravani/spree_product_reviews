# frozen_string_literal: true

require 'spec_helper'
require 'ostruct'

RSpec.describe 'Review Moderation & Auditing' do
  let(:review_class) do
    Class.new do
      attr_accessor :approved, :spam, :rejected, :hidden, :discarded_at,
                    :moderated_at, :moderator_name, :moderator_note, :rating,
                    :title, :review, :name, :product_name, :product

      def initialize
        @approved = false
        @spam = false
        @rejected = false
        @hidden = false
        @discarded_at = nil
      end

      def pending?
        !approved? && !spam? && !rejected? && !hidden? && discarded_at.nil?
      end

      def approved?
        !!@approved
      end

      def spam?
        !!@spam
      end

      def rejected?
        !!@rejected
      end

      def hidden?
        !!@hidden
      end

      def status
        return 'discarded' if discarded_at.present?
        return 'spam' if spam?
        return 'rejected' if rejected?
        return 'hidden' if hidden?
        return 'approved' if approved?

        'pending'
      end

      def approve!(moderator: nil, note: nil)
        @approved = true
        @spam = false
        @rejected = false
        @hidden = false
        @moderated_at = Time.current
        @moderator_name = moderator
        @moderator_note = note
      end

      def reject!(moderator: nil, note: nil)
        @approved = false
        @rejected = true
        @spam = false
        @moderated_at = Time.current
        @moderator_name = moderator
        @moderator_note = note
      end

      def mark_spam!(moderator: nil, note: nil)
        @spam = true
        @approved = false
        @rejected = false
        @moderated_at = Time.current
        @moderator_name = moderator
        @moderator_note = note
      end

      def restore_from_spam!(moderator: nil, note: nil)
        @spam = false
        @approved = false
        @rejected = false
        @moderated_at = Time.current
        @moderator_name = moderator
        @moderator_note = note
      end

      def hide!(moderator: nil, note: nil)
        @hidden = true
        @moderated_at = Time.current
        @moderator_name = moderator
        @moderator_note = note
      end

      def unhide!(moderator: nil, note: nil)
        @hidden = false
        @moderated_at = Time.current
        @moderator_name = moderator
        @moderator_note = note
      end

      def discard!(moderator: nil, note: nil)
        @discarded_at = Time.current
        @moderated_at = Time.current
        @moderator_name = moderator
        @moderator_note = note
      end

      def undiscard!(moderator: nil, note: nil)
        @discarded_at = nil
        @moderated_at = Time.current
        @moderator_name = moderator
        @moderator_note = note
      end
    end
  end

  let(:review) { review_class.new }

  it 'defaults to pending status' do
    expect(review.status).to eq('pending')
    expect(review.pending?).to be true
  end

  it 'approves review' do
    review.approve!(moderator: 'Staff User', note: 'Looks good')
    expect(review.approved).to be true
    expect(review.spam).to be false
    expect(review.rejected).to be false
    expect(review.status).to eq('approved')
  end

  it 'rejects review without destroying it' do
    review.reject!(moderator: 'Staff User', note: 'Violates terms')
    expect(review.approved).to be false
    expect(review.rejected).to be true
    expect(review.status).to eq('rejected')
  end

  it 'marks review as spam' do
    review.mark_spam!(moderator: 'Spam Filter')
    expect(review.spam).to be true
    expect(review.approved).to be false
    expect(review.status).to eq('spam')
  end

  it 'restores review from spam' do
    review.mark_spam!
    review.restore_from_spam!
    expect(review.spam).to be false
    expect(review.status).to eq('pending')
  end

  it 'hides review from storefront' do
    review.approve!
    review.hide!(moderator: 'Admin', note: 'Temporarily hidden for review')
    expect(review.hidden).to be true
    expect(review.status).to eq('hidden')
  end

  it 'unhides review' do
    review.hide!
    review.unhide!
    expect(review.hidden).to be false
  end

  it 'soft-deletes (discards) review' do
    review.discard!(moderator: 'Admin', note: 'Customer request')
    expect(review.discarded_at).not_to be_nil
    expect(review.status).to eq('discarded')
  end

  it 'restores soft-deleted review' do
    review.discard!
    review.undiscard!
    expect(review.discarded_at).to be_nil
    expect(review.status).to eq('pending')
  end
end

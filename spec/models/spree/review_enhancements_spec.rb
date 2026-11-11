require 'spec_helper'
require 'stringio'

RSpec.describe 'Spree Reviews enhancements', type: :model do
  let(:store) { Spree::Store.default.persisted? ? Spree::Store.default : create(:store, default: true, default_currency: 'INR') }
  let(:product) { create(:product, store: store) }
  let(:customer) { create(:user, first_name: 'Aarav', last_name: 'Patel') }

  around do |example|
    saved_config = (Spree::ReviewSetting::ALL_KEYS + [:auto_approve_reviews]).each_with_object({}) do |key, memo|
      memo[key] = SpreeProductReviews::Config[key]
    end
    example.run
  ensure
    saved_config.each { |key, value| SpreeProductReviews::Config[key] = value }
  end

  describe 'video media attachments' do
    it 'allows mp4 videos when allow_videos is true and rejects when disabled' do
      review = create(:review, product: product, store: store)
      media = review.review_media.build(position: 0)
      media.attachment.attach(
        io: StringIO.new('fake mp4 bytes'),
        filename: 'unboxing.mp4',
        content_type: 'video/mp4'
      )

      expect(media).to be_valid
      expect(media.video?).to be(true)
      expect(media.media_type).to eq('video')

      Spree::ReviewSetting.update_for_store!(store, allow_videos: false)
      disabled_media = review.review_media.build(position: 1)
      disabled_media.attachment.attach(
        io: StringIO.new('fake mp4 bytes'),
        filename: 'unboxing-2.mp4',
        content_type: 'video/mp4'
      )

      expect(disabled_media).not_to be_valid
      expect(disabled_media.errors[:attachment]).to include('Video uploads are currently disabled for reviews.')
    end

    it 'enforces max_video_size_megabytes' do
      Spree::ReviewSetting.update_for_store!(store, allow_videos: true, max_video_size_megabytes: 1)
      review = create(:review, product: product, store: store)
      media = review.review_media.build(position: 0)
      media.attachment.attach(
        io: StringIO.new('x' * 1.5.megabytes),
        filename: 'large.mp4',
        content_type: 'video/mp4'
      )

      expect(media).not_to be_valid
      expect(media.errors[:attachment]).to be_present
    end
  end

  describe 'unverified & guest eligibility' do
    it 'permits unverified authenticated buyers when allow_unverified is enabled' do
      Spree::ReviewSetting.update_for_store!(store, allow_unverified: true, allow_anonymous: false)

      guest_eligibility = Spree::ReviewEligibility.new(product: product, store: store, customer: nil)
      expect(guest_eligibility.can_review?).to be(false)
      expect(guest_eligibility.reason).to eq(Spree::ReviewEligibility::REASON_LOGIN_REQUIRED)

      user_eligibility = Spree::ReviewEligibility.new(product: product, store: store, customer: customer)
      expect(user_eligibility.can_review?).to be(true)
      expect(user_eligibility.verified_purchase?).to be(false)
    end

    it 'permits guest submissions when both allow_anonymous and allow_unverified are enabled' do
      Spree::ReviewSetting.update_for_store!(store, allow_unverified: true, allow_anonymous: true)

      guest_eligibility = Spree::ReviewEligibility.new(product: product, store: store, customer: nil)
      expect(guest_eligibility.can_review?).to be(true)
    end
  end

  describe 'moderation lifecycle, audits & reports' do
    let!(:review) { create(:review, :approved, product: product, store: store, customer: customer) }

    it 'records moderation audits across hide, unhide, mark_spam, and restore' do
      moderator = create(:admin_user)

      review.hide!(moderator: moderator, note: 'Temporarily hiding')
      expect(review.reload).to have_attributes(status: 'hidden', hidden: true)
      expect(Spree::ProductReviewSummary.find_by(product: product, store: store).reviews_count).to eq(0)

      review.unhide!(moderator: moderator, note: 'Verified safe')
      expect(review.reload).to have_attributes(status: 'approved', hidden: false, spam: false)
      expect(Spree::ProductReviewSummary.find_by(product: product, store: store).reviews_count).to eq(1)

      review.mark_spam!(moderator: moderator, note: 'Promo spam')
      expect(review.reload).to have_attributes(status: 'spam', spam: true)

      review.restore!(moderator: moderator, note: 'Restored to pending')
      expect(review.reload).to have_attributes(status: 'pending', spam: false, hidden: false, discarded_at: nil)

      expect(review.moderation_audits.pluck(:action)).to include('hide', 'unhide', 'spam', 'restore')
    end

    it 'auto-hides an approved review when customer reports reach threshold' do
      Spree::ReviewSetting.update_for_store!(store, report_moderation_threshold: 2)

      review.reports.create!(reason: 'inappropriate', customer: create(:user))
      expect(review.reload.flagged_count).to eq(1)
      expect(review.hidden?).to be(false)

      review.reports.create!(reason: 'spam', customer: create(:user))
      review.reload
      expect(review.flagged_count).to eq(2)
      expect(review.hidden?).to be(true)
      expect(review.status).to eq('hidden')
      expect(review.moderation_audits.pluck(:action)).to include('auto_hidden')
    end
  end

  describe 'abuse detection, IP anonymization & automatic Gift Card rewards' do
    it 'masks IPs, blocks links, flags spam words, and rejects duplicates when enforce_abuse_checks is enabled' do
      Spree::ReviewSetting.update_for_store!(
        store,
        anonymize_ips: true,
        disable_review_links: true,
        block_spam_reviews: true,
        spam_words: 'casino,free money'
      )

      link_review = build(
        :review,
        product: product,
        store: store,
        customer: customer,
        title: 'Check link',
        body: 'Visit https://spam.example.com now',
        enforce_abuse_checks: true
      )
      expect(link_review).not_to be_valid
      expect(link_review.errors[:base]).to include('External links and URLs are not permitted in reviews.')

      spam_review = create(
        :review,
        product: product,
        store: store,
        customer: customer,
        title: 'Earn fast',
        body: 'This works like a casino jackpot',
        ip_address: '192.168.10.42',
        enforce_abuse_checks: true
      )
      expect(spam_review.ip_address).to eq('192.168.10.0')
      expect(spam_review.ip_hash).to be_present
      expect(spam_review.spam?).to be(true)
      expect(spam_review.status).to eq('spam')
    end

    it 'issues a Spree::GiftCard once when a review with photo/video is approved' do
      Spree::ReviewSetting.update_for_store!(
        store,
        rewards_enabled: true,
        photo_reward_enabled: true,
        photo_reward_amount: 150.0,
        video_reward_enabled: true,
        video_reward_amount: 200.0
      )

      review = create(:review, product: product, store: store, customer: customer, status: 'pending')
      video_media = review.review_media.build(position: 0)
      video_media.attachment.attach(
        io: StringIO.new('video bytes'),
        filename: 'demo.mp4',
        content_type: 'video/mp4'
      )
      video_media.save!

      photo_media = create(:review_media, review: review, position: 1)
      expect(photo_media).to be_persisted
      expect(review.reload.reward_code).to be_nil

      review.approve!(moderator: create(:admin_user), note: 'Great unboxing')
      review.reload

      expect(review.reward_code).to be_present
      expect(review.reward_amount.to_f).to eq(200.0)
      expect(review.gift_card).to be_present
      expect(review.gift_card.amount.to_f).to eq(200.0)
      expect(review.gift_card.customer_id).to eq(customer.id)

      # Saving again should not mint a second Gift Card
      expect {
        review.update!(title: 'Updated title')
      }.not_to change(Spree::GiftCard, :count)
    end
  end
end


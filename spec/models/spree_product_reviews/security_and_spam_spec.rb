# frozen_string_literal: true

require 'spec_helper'
require 'ostruct'
require 'digest'

require_relative '../../../lib/spree_product_reviews/configuration'
require_relative '../../../lib/spree_product_reviews/version'

RSpec.describe 'Review Security, Anti-Abuse & Spam Prevention' do
  describe 'XSS Sanitization & HTML Stripping' do
    let(:sanitizer) do
      Class.new do
        def self.strip_html(str)
          return str if str.nil? || str.empty?

          str.gsub(/<[^>]*>/, '').strip
        end
      end
    end

    it 'strips script tags from review content' do
      malicious = 'Great product! <script>alert("xss")</script> Highly recommend.'
      expect(sanitizer.strip_html(malicious)).to eq('Great product! alert("xss") Highly recommend.')
    end

    it 'strips img onerror tags from title' do
      malicious = '<img src=x onerror=alert(1)>Awesome shoes'
      expect(sanitizer.strip_html(malicious)).to eq('Awesome shoes')
    end

    it 'strips formatting tags like b, em, a href' do
      html = '<b>Bold</b> and <a href="https://spam.com">click here</a>'
      expect(sanitizer.strip_html(html)).to eq('Bold and click here')
    end

    it 'handles clean text without modification' do
      clean = 'Just a regular clean review text.'
      expect(sanitizer.strip_html(clean)).to eq(clean)
    end
  end

  describe 'IP Anonymization & Salted SHA256 Hashing' do
    let(:ip_handler) do
      Class.new do
        def self.mask_ip(ip)
          return ip if ip.nil? || ip.empty?

          if ip.include?('.')
            parts = ip.split('.')
            parts[3] = '0' if parts.length == 4
            parts.join('.')
          elsif ip.include?(':')
            parts = ip.split(':')
            parts[-1] = '0000' if parts.any?
            parts.join(':')
          else
            ip
          end
        end

        def self.compute_hash(ip, salt = 'test_secret_salt_123')
          return nil if ip.nil? || ip.empty?

          Digest::SHA256.hexdigest("#{salt}:#{ip}")[0..31]
        end
      end
    end

    it 'masks IPv4 addresses by zeroing the last octet for privacy' do
      expect(ip_handler.mask_ip('192.168.1.145')).to eq('192.168.1.0')
      expect(ip_handler.mask_ip('103.21.244.78')).to eq('103.21.244.0')
    end

    it 'masks IPv6 addresses by zeroing the last segment' do
      expect(ip_handler.mask_ip('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).to eq('2001:0db8:85a3:0000:0000:8a2e:0370:0000')
    end

    it 'computes deterministic salted SHA256 hash' do
      hash1 = ip_handler.compute_hash('192.168.1.145', 'my_salt')
      hash2 = ip_handler.compute_hash('192.168.1.145', 'my_salt')
      hash_diff = ip_handler.compute_hash('192.168.1.146', 'my_salt')

      expect(hash1).to eq(hash2)
      expect(hash1).not_to eq(hash_diff)
      expect(hash1.length).to eq(32)
    end

    it 'generates different hashes with different salts' do
      h1 = ip_handler.compute_hash('10.0.0.1', 'salt_a')
      h2 = ip_handler.compute_hash('10.0.0.1', 'salt_b')
      expect(h1).not_to eq(h2)
    end
  end

  describe 'Spam Scoring & Heuristics' do
    let(:spam_analyzer) do
      Class.new do
        def self.calculate_score(title:, review:, blocked_words: ['viagra', 'casino', 'free money'])
          score = 0
          full_text = "#{title} #{review}".downcase

          # 1. Suspicious links (+50)
          if full_text.match?(%r{https?://|www\.|\.ru\b|\.cn\b|\.xyz\b})
            score += 50
          end

          # 2. Blocked keywords (+40)
          blocked_words.each do |bw|
            score += 40 if full_text.include?(bw.downcase.strip)
          end

          # 3. Excessive repeated characters (+30) e.g., "aaaaaaa" or "!!!!!!!!!"
          if full_text.match?(/([a-z!?.])\1{5,}/i)
            score += 30
          end

          score
        end
      end
    end

    it 'scores 0 for legitimate organic review' do
      score = spam_analyzer.calculate_score(
        title: 'Very comfortable sneakers',
        review: 'Wore them all day on a walking tour and my feet felt great.'
      )
      expect(score).to eq(0)
    end

    it 'adds 50 points for suspicious URLs' do
      score = spam_analyzer.calculate_score(
        title: 'Check this discount link',
        review: 'Get cheap deals at http://shady-deals.xyz right now!'
      )
      expect(score).to be >= 50
    end

    it 'adds 40 points for blocked spam words' do
      score = spam_analyzer.calculate_score(
        title: 'Best price',
        review: 'Sign up for online casino games and win today.'
      )
      expect(score).to be >= 40
    end

    it 'adds 30 points for excessive repeated characters' do
      score = spam_analyzer.calculate_score(
        title: 'soooooooo gooooood',
        review: 'LOVVVVVVVE THIS SHIRT!!!!!!!!'
      )
      expect(score).to be >= 30
    end

    it 'accumulates scores for multi-vector spam' do
      score = spam_analyzer.calculate_score(
        title: 'free money nowwwwww',
        review: 'Visit http://free-cash.xyz for instant jackpot casino bonuses!!!!!'
      )
      # 50 (link) + 40 (free money) + 40 (casino) + 30 (repetition) = 160
      expect(score).to be >= 120
    end
  end

  describe 'Submission Rate Limiting & Duplicate Detection' do
    let(:submission_guard) do
      Class.new do
        def self.check_rate_limit(customer_reviews_last_hour:, limit: 5)
          customer_reviews_last_hour >= limit
        end

        def self.check_duplicate(existing_reviews, title, review)
          clean_title = title.to_s.downcase.strip
          clean_body = review.to_s.downcase.strip

          existing_reviews.any? do |r|
            r[:title].to_s.downcase.strip == clean_title &&
              r[:review].to_s.downcase.strip == clean_body
          end
        end

        def self.check_one_per_customer(existing_reviews_by_customer_for_product)
          existing_reviews_by_customer_for_product.positive?
        end
      end
    end

    it 'flags rate limit exceeded when customer exceeds limit' do
      expect(submission_guard.check_rate_limit(customer_reviews_last_hour: 4, limit: 5)).to be false
      expect(submission_guard.check_rate_limit(customer_reviews_last_hour: 5, limit: 5)).to be true
      expect(submission_guard.check_rate_limit(customer_reviews_last_hour: 6, limit: 5)).to be true
    end

    it 'detects duplicate review with identical title and body' do
      existing = [
        { title: 'Great fit', review: 'Fits true to size.' }
      ]

      is_dup = submission_guard.check_duplicate(existing, 'Great fit', 'Fits true to size.')
      expect(is_dup).to be true

      is_not_dup = submission_guard.check_duplicate(existing, 'Great fit', 'Runs slightly small.')
      expect(is_not_dup).to be false
    end

    it 'enforces one review per product per customer policy' do
      expect(submission_guard.check_one_per_customer(0)).to be false
      expect(submission_guard.check_one_per_customer(1)).to be true
    end
  end

  describe 'Review Reporting & Auto-Flagging Threshold' do
    let(:review_with_reports) do
      Class.new do
        attr_accessor :approved, :hidden, :flagged_count, :reports, :audits

        def initialize(approved: true)
          @approved = approved
          @hidden = false
          @flagged_count = 0
          @reports = []
          @audits = []
        end

        def add_report(reason:, customer_id: nil, threshold: 3)
          @reports << { reason: reason, customer_id: customer_id }
          @flagged_count += 1

          if @flagged_count >= threshold && @approved
            @approved = false
            @hidden = true
            @audits << { action: :auto_flagged, note: "Threshold reached: #{@flagged_count}" }
          end
        end

        def dismiss_reports!(moderator: 'Admin')
          @reports.each { |r| r[:status] = 'dismissed' }
          @flagged_count = 0
          @hidden = false
          @approved = true
          @audits << { action: :reports_dismissed, moderator: moderator }
        end
      end
    end

    it 'increments flagged_count on each report' do
      review = review_with_reports.new(approved: true)
      review.add_report(reason: 'spam', threshold: 3)
      expect(review.flagged_count).to eq(1)
      expect(review.approved).to be true
      expect(review.hidden).to be false
    end

    it 'automatically unapproves and hides review when threshold (3) is reached' do
      review = review_with_reports.new(approved: true)
      review.add_report(reason: 'spam', threshold: 3)
      review.add_report(reason: 'inappropriate', threshold: 3)
      expect(review.approved).to be true

      review.add_report(reason: 'misleading', threshold: 3)
      expect(review.flagged_count).to eq(3)
      expect(review.approved).to be false
      expect(review.hidden).to be true
      expect(review.audits.last[:action]).to eq(:auto_flagged)
    end

    it 'allows moderator to dismiss reports and restore review' do
      review = review_with_reports.new(approved: true)
      3.times { review.add_report(reason: 'spam', threshold: 3) }
      expect(review.hidden).to be true

      review.dismiss_reports!(moderator: 'Admin Jane')
      expect(review.flagged_count).to eq(0)
      expect(review.hidden).to be false
      expect(review.approved).to be true
      expect(review.audits.last[:action]).to eq(:reports_dismissed)
    end
  end

  describe 'Customer Appeal Workflow' do
    let(:appeal_review) do
      Class.new do
        attr_accessor :approved, :spam, :rejected, :hidden, :moderator_note, :audits

        def initialize
          @approved = false
          @spam = true
          @rejected = false
          @hidden = false
          @moderator_note = nil
          @audits = []
        end

        def appeal!(reason:)
          @spam = false
          @rejected = false
          @approved = false
          @hidden = false
          @moderator_note = "Appeal submitted by customer: #{reason}".strip
          @audits << { action: :appealed, moderator: 'Customer', note: reason }
        end
      end
    end

    it 'moves spam or rejected review back to pending on appeal with customer note' do
      rev = appeal_review.new
      expect(rev.spam).to be true

      rev.appeal!(reason: 'This was a legitimate purchase and review, please re-evaluate.')
      expect(rev.spam).to be false
      expect(rev.rejected).to be false
      expect(rev.approved).to be false
      expect(rev.moderator_note).to include('Appeal submitted by customer')
      expect(rev.audits.last[:action]).to eq(:appealed)
    end
  end

  describe 'Verified Purchaser Order Matching' do
    let(:verifier) do
      Class.new do
        def self.verify(customer_id: nil, email: nil, order_records: [])
          order_records.any? do |ord|
            matches_customer = customer_id.present? && ord[:customer_id] == customer_id
            matches_email = email.present? && ord[:email].to_s.downcase.strip == email.to_s.downcase.strip
            (matches_customer || matches_email) && ord[:status].in?(%w[placed complete])
          end
        end
      end
    end

    it 'verifies customer who has a completed order' do
      orders = [
        { customer_id: 42, email: 'buyer@example.com', status: 'complete' }
      ]
      expect(verifier.verify(customer_id: 42, order_records: orders)).to be true
    end

    it 'verifies guest customer by email with placed order' do
      orders = [
        { customer_id: nil, email: 'guest@example.com', status: 'placed' }
      ]
      expect(verifier.verify(email: 'guest@example.com', order_records: orders)).to be true
    end

    it 'returns false for unpaid or incomplete order' do
      orders = [
        { customer_id: 42, email: 'buyer@example.com', status: 'cart' }
      ]
      expect(verifier.verify(customer_id: 42, order_records: orders)).to be false
    end

    it 'returns false when no matching order exists' do
      orders = [
        { customer_id: 99, email: 'other@example.com', status: 'complete' }
      ]
      expect(verifier.verify(customer_id: 42, email: 'buyer@example.com', order_records: orders)).to be false
    end
  end
end

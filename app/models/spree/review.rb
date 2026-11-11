require 'digest'

module Spree
  class Review < Spree.base_class
    has_prefix_id :rev

    include Spree::Metadata

    STATUSES = %w[pending approved rejected spam hidden].freeze
    TITLE_MAX_LENGTH = 120
    TITLE_EXCERPT_LENGTH = 80
    BODY_EXCERPT_LENGTH = 100
    URL_PATTERN = %r{(?:https?://|www\.)\S+|(?<![@\w])[a-z0-9-]+(?:\.[a-z0-9-]+)+\.(?:com|net|org|io|co|in|info|biz|ru|cn|xyz|top|click)(?:[/?#]\S*)?}i

    attr_accessor :enforce_abuse_checks

    attribute :status, :string, default: -> { SpreeProductReviews::Config[:auto_approve_reviews] ? 'approved' : 'pending' }
    attribute :verified_purchase, :boolean, default: false
    attribute :show_identifier, :boolean, default: true
    attribute :hidden, :boolean, default: false
    attribute :spam, :boolean, default: false
    attribute :spam_score, :integer, default: 0
    attribute :flagged_count, :integer, default: 0
    attribute :helpful_count, :integer, default: 0
    attribute :not_helpful_count, :integer, default: 0

    self.whitelisted_ransackable_attributes = %w[
      product_id variant_id order_id store_id customer_id rating status verified_purchase
      reviewer_name title body locale helpful_count not_helpful_count flagged_count
      hidden spam created_at updated_at
    ]
    self.whitelisted_ransackable_associations = %w[product variant order store customer answers review_media votes moderation_audits reports]

    belongs_to :product, class_name: 'Spree::Product', inverse_of: :reviews, touch: true
    belongs_to :variant, class_name: 'Spree::Variant', optional: true
    belongs_to :order, class_name: 'Spree::Order', optional: true
    belongs_to :store, class_name: 'Spree::Store'
    belongs_to :customer, class_name: Spree.customer_class.to_s, optional: true
    belongs_to :gift_card, class_name: 'Spree::GiftCard', foreign_key: :reward_gift_card_id, optional: true

    has_many :review_media, class_name: 'Spree::ReviewMedia', dependent: :destroy, inverse_of: :review
    has_many :answers, class_name: 'Spree::ReviewAnswer', dependent: :destroy, inverse_of: :review
    has_many :votes, class_name: 'Spree::ReviewVote', dependent: :destroy, inverse_of: :review
    has_many :moderation_audits, class_name: 'Spree::ReviewModerationAudit', dependent: :destroy, inverse_of: :review
    has_many :reports, class_name: 'Spree::ReviewReport', dependent: :destroy, inverse_of: :review

    accepts_nested_attributes_for :review_media, allow_destroy: true
    accepts_nested_attributes_for :answers, allow_destroy: true

    before_validation :normalize_optional_text_fields
    before_validation :compute_and_assign_ip_hash

    validates :product, :store, presence: true
    validates :status, presence: true, inclusion: { in: STATUSES }
    validates :verified_purchase, inclusion: { in: [true, false] }
    validates :title, presence: true, if: :title_required?
    validates :title, length: { maximum: TITLE_MAX_LENGTH }, if: :title_length_validation_required?
    validates :customer_id, uniqueness: { scope: [:store_id, :order_id, :product_id, :variant_id], allow_nil: true },
                            if: :enforce_unique_customer_product?
    validates :rating, numericality: {
      only_integer: true,
      greater_than_or_equal_to: 1,
      less_than_or_equal_to: 5
    }
    validate :product_belongs_to_store
    validate :variant_belongs_to_product
    validate :order_belongs_to_store_and_customer
    validate :order_contains_reviewed_item
    validate :review_media_count_within_limit
    validate :validate_abuse_and_links, if: :enforce_abuse_checks

    scope :not_discarded, -> { where(discarded_at: nil) }
    scope :discarded, -> { where.not(discarded_at: nil) }
    scope :approved, -> { not_discarded.where(status: 'approved', hidden: false, spam: false) }
    scope :pending, -> { not_discarded.where(status: 'pending', hidden: false, spam: false) }
    scope :rejected, -> { not_discarded.where(status: 'rejected') }
    scope :spam, -> { not_discarded.where(spam: true).or(not_discarded.where(status: 'spam')) }
    scope :hidden, -> { not_discarded.where(hidden: true).or(not_discarded.where(status: 'hidden')) }
    scope :flagged, -> { not_discarded.where('flagged_count > 0') }
    scope :for_store, ->(store) { where(store: store) }
    scope :for_product, ->(product) { where(product: product) }
    scope :with_rating, ->(ratings) { where(rating: Array(ratings).map(&:to_i).select { |rating| rating.between?(1, 5) }) }
    scope :with_images, -> { joins(:review_media).distinct }
    scope :with_videos, lambda {
      joins(review_media: { attachment_attachment: :blob }).
        where(active_storage_blobs: { content_type: Spree::ReviewMedia::VIDEO_CONTENT_TYPES }).
        distinct
    }
    scope :verified_purchase, -> { where(verified_purchase: true) }
    scope :recent_first, -> { order(created_at: :desc, id: :desc) }
    scope :highest_rating_first, -> { order(rating: :desc, created_at: :desc, id: :desc) }
    scope :lowest_rating_first, -> { order(rating: :asc, created_at: :desc, id: :desc) }

    before_create :evaluate_spam_signals
    before_update :evaluate_spam_signals, if: :should_evaluate_spam_on_update?
    after_commit :recalculate_product_review_summary
    after_commit :issue_review_reward_if_eligible!, on: [:create, :update]

    def self.with_answer(question_key:, values:)
      values = Array(values).reject { |value| value.nil? || (value.respond_to?(:empty?) && value.empty?) }
      return none if question_key.blank? || values.empty?

      query = joins(answers: :question).
              left_joins(answers: :option).
              where(spree_review_questions: { key: question_key })
      conditions = []
      bind_values = {}
      text_values = values.map(&:to_s)
      numeric_values = values.filter_map { |value| numeric_filter_value(value) }
      boolean_values = values.map { |value| boolean_filter_value(value) }.reject(&:nil?).uniq

      unless text_values.empty?
        conditions << 'spree_review_question_options.value IN (:text_values)'
        conditions << 'spree_review_answers.value_text IN (:text_values)'
        bind_values[:text_values] = text_values
      end

      unless numeric_values.empty?
        conditions << 'spree_review_answers.value_number IN (:numeric_values)'
        bind_values[:numeric_values] = numeric_values
      end

      unless boolean_values.empty?
        conditions << 'spree_review_answers.value_boolean IN (:boolean_values)'
        bind_values[:boolean_values] = boolean_values
      end

      query.where(conditions.join(' OR '), bind_values).distinct
    end

    def self.numeric_filter_value(value)
      BigDecimal(value.to_s)
    rescue ArgumentError
      nil
    end

    def self.boolean_filter_value(value)
      case value
      when true, false
        value
      else
        {
          'true' => true,
          '1' => true,
          'yes' => true,
          'false' => false,
          '0' => false,
          'no' => false
        }[value.to_s.downcase]
      end
    end

    def approve!(moderator: nil, note: nil)
      update!(
        status: 'approved',
        hidden: false,
        spam: false,
        discarded_at: nil,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :approve, moderator: moderator, note: note)
      issue_review_reward_if_eligible!
      true
    end

    def reject!(moderator: nil, note: nil)
      update!(
        status: 'rejected',
        hidden: false,
        spam: false,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :reject, moderator: moderator, note: note)
      true
    end

    def hide!(moderator: nil, note: nil)
      update!(
        status: 'hidden',
        hidden: true,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :hide, moderator: moderator, note: note)
      true
    end

    def unhide!(moderator: nil, note: nil)
      update!(
        status: 'approved',
        hidden: false,
        spam: false,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :unhide, moderator: moderator, note: note)
      issue_review_reward_if_eligible!
      true
    end

    def mark_spam!(moderator: nil, note: nil)
      update!(
        status: 'spam',
        spam: true,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :spam, moderator: moderator, note: note)
      true
    end

    def restore!(moderator: nil, note: nil, audit_action: :restore)
      update!(
        status: 'pending',
        discarded_at: nil,
        hidden: false,
        spam: false,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: audit_action, moderator: moderator, note: note)
      true
    end

    def discard!(moderator: nil, note: nil)
      update!(
        discarded_at: Time.current,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :discard, moderator: moderator, note: note)
      true
    end

    def remove_media!(media_id, moderator: nil, note: nil)
      media = review_media.find_by(id: media_id) || review_media.find_by_prefix_id(media_id.to_s)
      return false if media.blank?

      filename = media.attachment.attached? ? media.attachment.filename.to_s : media.id.to_s
      media.destroy!
      record_audit!(action: :media_removed, moderator: moderator, note: note, metadata: { media_id: media_id, filename: filename })
      true
    end

    def record_audit!(action:, moderator: nil, note: nil, metadata: nil)
      return unless persisted?

      moderation_audits.create(
        action: action.to_s,
        moderator_name: moderator_display_name(moderator),
        moderator_id: moderator.respond_to?(:id) ? moderator.id : nil,
        moderator_type: moderator.is_a?(ActiveRecord::Base) ? moderator.class.name : nil,
        note: note.presence,
        metadata: metadata
      )
    rescue StandardError => e
      Rails.logger.warn("[SpreeProductReviews] Audit log failed: #{e.message}") if defined?(Rails)
    end

    def issue_review_reward_if_eligible!
      return unless persisted? && store.present? && customer.present?
      return unless status == 'approved' && !hidden? && !spam? && discarded_at.nil?
      return if reward_code.present? || reward_gift_card_id.present?
      return unless store_settings[:rewards_enabled]
      return unless defined?(Spree::GiftCard)

      media_records = review_media.includes(attachment_attachment: :blob).to_a
      return if media_records.empty?

      has_video = media_records.any?(&:video?)
      has_photo = media_records.any?(&:image?)
      video_ok = has_video && store_settings[:video_reward_enabled]
      photo_ok = has_photo && store_settings[:photo_reward_enabled]
      return unless video_ok || photo_ok

      candidates = []
      promotion_id = nil
      if video_ok
        candidates << store_settings[:video_reward_amount].to_f
        promotion_id = store_settings[:video_reward_promotion_id].presence
      end
      if photo_ok
        candidates << store_settings[:photo_reward_amount].to_f
        promotion_id ||= store_settings[:photo_reward_promotion_id].presence
      end
      reward_amt = candidates.max.to_f.round(2)
      return unless reward_amt.positive?

      currency = store.default_currency.presence || 'INR'

      with_lock do
        reload
        return if reward_code.present? || reward_gift_card_id.present?

        gift_card = Spree::GiftCard.create!(
          store: store,
          customer: customer,
          amount: reward_amt,
          currency: currency
        )

        new_meta = (metadata.is_a?(Hash) ? metadata : {}).merge(
          'reward_gift_card_id' => gift_card.prefixed_id,
          'reward_code' => gift_card.code,
          'reward_amount' => gift_card.amount.to_s,
          'reward_currency' => currency,
          'reward_issued_at' => Time.current.iso8601
        )
        new_meta['reward_promotion_id'] = promotion_id if promotion_id.present?

        update_columns(
          reward_code: gift_card.code,
          reward_amount: gift_card.amount,
          reward_gift_card_id: gift_card.id,
          metadata: new_meta,
          updated_at: Time.current
        )

        record_audit!(
          action: :reward_issued,
          note: "Gift card reward #{gift_card.code} (#{currency} #{gift_card.amount}) issued for approved media review."
        )
      end
    rescue StandardError => e
      Rails.logger.error("[SpreeProductReviews] Reward issuance failed for review ##{id}: #{e.message}") if defined?(Rails)
    end

    def recalculate_summary_safely!
      recalculate_product_review_summary
    end

    def self.public_reviewer_name(name)
      normalized_name = name.to_s.squish
      return if normalized_name.blank?

      name_parts = normalized_name.split(/\s+/)
      public_reviewer_name_from_parts(
        name_parts.first,
        name_parts.length > 1 ? name_parts.last : nil
      )
    end

    def self.public_reviewer_name_from_parts(first_name, last_name = nil)
      normalized_first_name = first_name.to_s.squish.presence
      normalized_last_name = last_name.to_s.squish.presence
      return if normalized_first_name.blank? && normalized_last_name.blank?

      first_name = normalized_first_name
      if first_name.blank? && normalized_last_name.present?
        first_name = "#{normalized_last_name.first.upcase}."
      end
      last_initial = if normalized_first_name.present? && normalized_last_name.present?
                       normalized_last_name.first&.upcase
                     end

      [first_name, last_initial.present? ? "#{last_initial}." : nil].compact.join(' ')
    end

    def self.profile_reviewer_name_from_user(user)
      return if user.blank?

      first_name = user.try(:firstname).presence || user.try(:first_name).presence
      last_name = user.try(:lastname).presence || user.try(:last_name).presence
      full_name = [first_name, last_name].compact_blank.join(' ').presence
      return full_name if full_name.present?

      return user.full_name if user.respond_to?(:full_name) && user.full_name.present?
      if user.respond_to?(:name) && user.name.respond_to?(:full) && user.name.full.present?
        return user.name.full
      end

      user.name if user.respond_to?(:name) && user.name.is_a?(String) && user.name.present?
    end

    def self.admin_reviewer_name_from_user(user)
      profile_reviewer_name_from_user(user) ||
        (user.email.presence if user&.respond_to?(:email))
    end

    def reviewer_display_name
      return (verified_purchase? ? 'Verified Customer' : Spree.t(:anonymous)) unless show_identifier?

      self.class.public_reviewer_name(
        self.class.profile_reviewer_name_from_user(customer) || reviewer_name.presence
      ) ||
        Spree.t(:anonymous)
    end

    def admin_reviewer_name
      self.class.admin_reviewer_name_from_user(customer) || reviewer_name.presence || Spree.t(:anonymous)
    end

    def admin_display_name
      title.presence || "Review #{prefixed_id || id || ''}".squish
    end

    def title_excerpt(length: TITLE_EXCERPT_LENGTH)
      admin_display_name.truncate(length)
    end

    def body_excerpt(length: BODY_EXCERPT_LENGTH)
      body_text = body.to_s.squish
      return 'No written review content' if body_text.blank?

      body_text.truncate(length)
    end

    def attributed_order
      order || purchase_attribution_target&.order
    end

    def current_vote_for(customer: nil, ip_address: nil)
      if customer.present?
        votes.find_by(customer: customer)&.vote
      elsif ip_address.present?
        votes.find_by(ip_address: ip_address)&.vote
      end
    end

    def recalculate_vote_counts!
      update_columns(
        helpful_count: votes.helpful.count,
        not_helpful_count: votes.not_helpful.count,
        updated_at: Time.current
      )
    end

    private

    def purchase_attribution_target
      return @purchase_attribution_target if defined?(@purchase_attribution_target)

      @purchase_attribution_target = Spree::ReviewPurchaseAttribution.new(self).target
    end

    def normalize_optional_text_fields
      self.title = strip_html(title).squish if title.present?
      self.title = title.to_s.squish if title.nil?
      self.body = body.present? ? strip_html(body).strip : body.to_s.strip
      self.reviewer_name = strip_html(reviewer_name).squish if reviewer_name.present?
    end

    def strip_html(value)
      return '' if value.blank?

      str = value.to_s
      if defined?(ActionController::Base) && ActionController::Base.helpers.respond_to?(:strip_tags)
        ActionController::Base.helpers.strip_tags(str)
      else
        str.gsub(/<[^>]*>/, '')
      end
    end

    def store_settings
      @store_settings ||= Spree::ReviewSetting.for_store(store)
    end

    def enforce_unique_customer_product?
      store_settings[:reviews_per_product_limit].to_s != 'unlimited'
    end

    def moderator_display_name(moderator)
      return 'System' if moderator.nil?
      return moderator.name if moderator.respond_to?(:name) && moderator.name.present?
      return moderator.email if moderator.respond_to?(:email) && moderator.email.present?
      return "User##{moderator.id}" if moderator.respond_to?(:id)

      moderator.to_s
    end

    def compute_and_assign_ip_hash
      return if ip_address.blank?

      if ip_hash.blank?
        salt = if defined?(Rails.application) && Rails.application.respond_to?(:secret_key_base) && Rails.application.secret_key_base.present?
                 Rails.application.secret_key_base
               else
                 'spree_reviews_ip_salt'
               end
        self.ip_hash = Digest::SHA256.hexdigest("#{salt}:#{ip_address}")[0..31]
      end

      self.ip_address = mask_ip(ip_address) if store_settings[:anonymize_ips]
    end

    def mask_ip(ip)
      return ip if ip.blank?

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

    def validate_abuse_and_links
      settings = store_settings
      combined = "#{title} #{body}"

      if settings[:disable_review_links] && combined.match?(URL_PATTERN)
        errors.add(:base, 'External links and URLs are not permitted in reviews.')
      end

      if customer_id.present?
        limit = settings[:customer_rate_limit_per_hour].to_i
        recent_customer_reviews = self.class.where(customer_id: customer_id).where('created_at > ?', 1.hour.ago)
        recent_customer_reviews = recent_customer_reviews.where.not(id: id) if persisted?
        if limit.positive? && recent_customer_reviews.count >= limit
          errors.add(:base, "You have reached the submission limit of #{limit} reviews per hour. Please try again later.")
        end
      end

      if ip_hash.present?
        ip_limit = settings[:ip_rate_limit_per_hour].to_i
        recent_ip_reviews = self.class.where(ip_hash: ip_hash).where('created_at > ?', 1.hour.ago)
        recent_ip_reviews = recent_ip_reviews.where.not(id: id) if persisted?
        if ip_limit.positive? && recent_ip_reviews.count >= ip_limit
          errors.add(:base, 'Submission rate limit exceeded for this network. Please try again later.')
        end
      end

      window_hours = settings[:duplicate_detection_window_hours].to_i
      if window_hours.positive?
        scope = self.class.not_discarded.where(store_id: store_id, product_id: product_id).where('created_at > ?', window_hours.hours.ago)
        scope = scope.where.not(id: id) if persisted?
        if customer_id.present?
          scope = scope.where(customer_id: customer_id)
        elsif ip_hash.present?
          scope = scope.where(ip_hash: ip_hash)
        else
          scope = nil
        end

        if scope&.any? { |r| r.title.to_s.downcase.strip == title.to_s.downcase.strip && r.body.to_s.downcase.strip == body.to_s.downcase.strip }
          errors.add(:base, 'A review with identical title and content was already submitted recently.')
        end
      end
    end

    def should_evaluate_spam_on_update?
      enforce_abuse_checks && (will_save_change_to_title? || will_save_change_to_body?)
    end

    def evaluate_spam_signals
      settings = store_settings
      return unless settings[:block_spam_reviews]

      text = "#{title} #{body}".downcase
      score = 0

      terms = settings[:spam_words].to_s.split(',').map { |w| w.strip.downcase }.reject(&:blank?)
      terms.each do |term|
        score += 50 if text.include?(term)
      end

      score += 40 if body.present? && body.scan(/(.)\1{6,}/).any?
      score += 30 if text.match?(URL_PATTERN) && !settings[:disable_review_links]

      self.spam_score = score
      return unless score >= 50

      self.spam = true
      self.status = 'spam'
    end

    def title_required?
      new_record? || will_save_change_to_title? || title_in_database.present?
    end

    def title_length_validation_required?
      new_record? || will_save_change_to_title?
    end

    def product_belongs_to_store
      return if product.blank? || store.blank?
      return if Spree::Product.for_store(store).where(id: product.id).exists?

      errors.add(:product, :invalid)
    end

    def variant_belongs_to_product
      return if variant.blank? || product.blank?
      return if variant.product_id == product.id

      errors.add(:variant, :invalid)
    end

    def order_belongs_to_store_and_customer
      return if order.blank?

      errors.add(:order, :invalid) if store.present? && order.store_id != store.id
      errors.add(:order, :invalid) if customer.present? && order.customer_id != customer.id
    end

    def order_contains_reviewed_item
      return if order.blank? || product.blank?
      return unless order_purchase_validation_required?
      return if order_contains_reviewable_purchase?

      errors.add(:order, :invalid)
    end

    def order_purchase_validation_required?
      new_record? ||
        will_save_change_to_order_id? ||
        will_save_change_to_product_id? ||
        will_save_change_to_variant_id?
    end

    def order_contains_reviewable_purchase?
      Spree::ReviewablePurchase.new(order: order, product: product, variant: variant).reviewable?
    end

    def review_media_count_within_limit
      max_images = store_settings[:max_images_per_review].to_i
      return if max_images <= 0

      kept_media = review_media.reject(&:marked_for_destruction?)
      errors.add(:review_media, :too_long, count: max_images) if kept_media.size > max_images
    end

    def recalculate_product_review_summary
      return if product_id.blank? || store_id.blank?

      Spree::ProductReviewSummary.recalculate!(product_id: product_id, store_id: store_id)
    end
  end
end

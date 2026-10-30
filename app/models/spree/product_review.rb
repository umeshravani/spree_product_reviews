# frozen_string_literal: true

module Spree
  class ProductReview < (defined?(Spree.base_class) ? Spree.base_class : (defined?(Spree::Base) ? Spree::Base : ActiveRecord::Base))
    self.table_name = 'spree_product_reviews'

    belongs_to :product, class_name: 'Spree::Product'
    belongs_to :variant, class_name: 'Spree::Variant', optional: true
    belongs_to :customer, class_name: (defined?(Spree.customer_class) && Spree.customer_class ? Spree.customer_class.to_s : 'Spree::Customer'), optional: true
    belongs_to :user, class_name: (defined?(Spree.user_class) && Spree.user_class ? Spree.user_class.to_s : 'Spree::User'), optional: true
    belongs_to :order, class_name: 'Spree::Order', optional: true

    has_many :votes, class_name: 'Spree::ReviewVote', foreign_key: :review_id, dependent: :destroy
    has_many :moderation_audits, class_name: 'Spree::ReviewModerationAudit', foreign_key: :review_id, dependent: :destroy
    has_many_attached :images

    validates :product, presence: true
    validates :rating, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 5 }
    validates :title, presence: true, length: { maximum: 255 }
    validates :review, presence: true
    validate :validate_images

    attribute :show_identifier, :boolean, default: true
    attribute :verified_purchaser, :boolean, default: false
    attribute :spam, :boolean, default: false
    attribute :approved, :boolean, default: false
    attribute :hidden, :boolean, default: false
    attribute :rejected, :boolean, default: false
    attribute :helpful_count, :integer, default: 0
    attribute :unhelpful_count, :integer, default: 0

    scope :approved, -> { where(approved: true, spam: false, hidden: false, rejected: false, discarded_at: nil) }
    scope :pending, -> { where(approved: false, spam: false, hidden: false, rejected: false, discarded_at: nil) }
    scope :spam, -> { where(spam: true, discarded_at: nil) }
    scope :rejected, -> { where(rejected: true, discarded_at: nil) }
    scope :hidden, -> { where(hidden: true, discarded_at: nil) }
    scope :not_discarded, -> { where(discarded_at: nil) }
    scope :discarded, -> { where.not(discarded_at: nil) }
    scope :verified, -> { where(verified_purchaser: true) }
    scope :by_rating, ->(r) { where(rating: r) }
    scope :newest, -> { order(created_at: :desc) }
    scope :highest_rating, -> { order(rating: :desc, created_at: :desc) }
    scope :lowest_rating, -> { order(rating: :asc, created_at: :desc) }
    scope :most_helpful, -> { order(helpful_count: :desc, created_at: :desc) }

    before_validation :set_default_product_name, on: :create
    before_create :evaluate_verified_purchaser
    after_save :recalculate_product_rating, if: -> {
      saved_change_to_approved? || saved_change_to_spam? || saved_change_to_rating? ||
        saved_change_to_hidden? || saved_change_to_rejected? || saved_change_to_discarded_at?
    }
    after_destroy :recalculate_product_rating

    def set_default_product_name
      self.product_name ||= product&.name
    end

    def pending?
      !approved? && !spam? && !rejected? && !hidden? && discarded_at.nil?
    end

    def status
      return 'discarded' if discarded_at.present?
      return 'spam' if spam?
      return 'rejected' if rejected?
      return 'hidden' if hidden?
      return 'approved' if approved?

      'pending'
    end

    def record_audit!(action:, moderator: nil, note: nil, metadata: nil)
      mod_name = moderator_display_name(moderator)
      mod_id = moderator.respond_to?(:id) ? moderator.id : nil
      mod_type = moderator.is_a?(ActiveRecord::Base) ? moderator.class.name : nil

      moderation_audits.create(
        action: action.to_s,
        moderator_name: mod_name,
        moderator_id: mod_id,
        moderator_type: mod_type,
        note: note,
        metadata: metadata
      )
    rescue StandardError => e
      Rails.logger.warn("[SpreeProductReviews] Audit record creation failed: #{e.message}")
    end

    def approve!(moderator: nil, note: nil)
      update(
        approved: true,
        spam: false,
        rejected: false,
        hidden: false,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :approve, moderator: moderator, note: note)
      recalculate_product_rating
    end

    def reject!(moderator: nil, note: nil)
      update(
        approved: false,
        rejected: true,
        spam: false,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :reject, moderator: moderator, note: note)
      recalculate_product_rating
    end

    def mark_spam!(moderator: nil, note: nil)
      update(
        spam: true,
        approved: false,
        rejected: false,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :mark_spam, moderator: moderator, note: note)
      recalculate_product_rating
    end

    def restore_from_spam!(moderator: nil, note: nil)
      update(
        spam: false,
        approved: false,
        rejected: false,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :restore_from_spam, moderator: moderator, note: note)
      recalculate_product_rating
    end
    alias_method :unmark_spam!, :restore_from_spam!

    def hide!(moderator: nil, note: nil)
      update(
        hidden: true,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :hide, moderator: moderator, note: note)
      recalculate_product_rating
    end

    def unhide!(moderator: nil, note: nil)
      update(
        hidden: false,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :unhide, moderator: moderator, note: note)
      recalculate_product_rating
    end

    def restore!(moderator: nil, note: nil)
      update(
        approved: true,
        spam: false,
        rejected: false,
        hidden: false,
        discarded_at: nil,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :restore, moderator: moderator, note: note)
      recalculate_product_rating
    end

    def discard!(moderator: nil, note: nil)
      update(
        discarded_at: Time.current,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :soft_delete, moderator: moderator, note: note)
      recalculate_product_rating
    end

    def undiscard!(moderator: nil, note: nil)
      update(
        discarded_at: nil,
        moderated_at: Time.current,
        moderator_name: moderator_display_name(moderator),
        moderator_note: note
      )
      record_audit!(action: :restore, moderator: moderator, note: note)
      recalculate_product_rating
    end

    def remove_image!(attachment_id, moderator: nil, note: nil)
      attachment = images.attachments.find_by(id: attachment_id)
      return false unless attachment

      blob_filename = attachment.filename.to_s
      attachment.purge
      record_audit!(
        action: :remove_image,
        moderator: moderator,
        note: note,
        metadata: { image_id: attachment_id, filename: blob_filename }.to_json
      )
      true
    end

    def moderator_display_name(moderator)
      return 'System' if moderator.nil?
      return moderator.name if moderator.respond_to?(:name) && moderator.name.present?
      return moderator.email if moderator.respond_to?(:email) && moderator.email.present?
      return "User##{moderator.id}" if moderator.respond_to?(:id)

      moderator.to_s
    end

    def reviewer_name
      return name if name.present?

      if show_identifier
        if customer.present?
          if customer.respond_to?(:first_name) && customer.first_name.present?
            last_initial = customer.respond_to?(:last_name) && customer.last_name.present? ? " #{customer.last_name[0]}." : ''
            "#{customer.first_name}#{last_initial}".strip
          else
            verified_purchaser? ? 'Verified Buyer' : 'Anonymous'
          end
        elsif user.present?
          if user.respond_to?(:name) && user.name.present?
            user.name
          else
            verified_purchaser? ? 'Verified Buyer' : 'Anonymous'
          end
        else
          'Anonymous'
        end
      else
        'Anonymous'
      end
    end

    def evaluate_verified_purchaser
      self.verified_purchaser = check_verified_purchase
      true
    end

    def check_verified_purchase
      return false if customer.nil? && user.nil?
      return true if order_id.present?

      target_product = product
      return false unless target_product

      variant_ids = target_product.variants_including_master.select(:id)

      # Adapt query to Spree 6 (completed_at / status) vs Spree 5 (state)
      completed_orders = if Spree::Order.column_names.include?('completed_at')
                           Spree::Order.where.not(completed_at: nil)
                         elsif Spree::Order.column_names.include?('status')
                           Spree::Order.where(status: %w[placed complete])
                         elsif Spree::Order.column_names.include?('state')
                           Spree::Order.where(state: 'complete')
                         else
                           Spree::Order.all
                         end

      if customer_id.present? && Spree::Order.column_names.include?('customer_id')
        return true if completed_orders.where(customer_id: customer_id)
                                       .joins(:line_items)
                                       .where(spree_line_items: { variant_id: variant_ids })
                                       .exists?
      end

      if user_id.present? && Spree::Order.column_names.include?('user_id')
        return true if completed_orders.where(user_id: user_id)
                                       .joins(:line_items)
                                       .where(spree_line_items: { variant_id: variant_ids })
                                       .exists?
      end

      false
    rescue StandardError => e
      Rails.logger.warn("[SpreeProductReviews] Verified purchase check error: #{e.message}")
      false
    end

    def recalculate_product_rating
      return unless product

      product.with_lock do
        approved_reviews = product.reviews.approved
        count = approved_reviews.count
        avg = count.positive? ? approved_reviews.average(:rating).to_f.round(2) : 0.0

        product.update_columns(average_rating: avg, review_count: count)
      end
    rescue StandardError => e
      Rails.logger.error("[SpreeProductReviews] Rating recalculation failed: #{e.message}")
    end

    def vote!(helpful:, customer_id: nil, user_id: nil, ip_address: nil)
      vote = votes.build(
        customer_id: customer_id,
        user_id: user_id,
        ip_address: (customer_id || user_id) ? nil : ip_address,
        helpful: helpful
      )
      vote.save!
    end

    private

    def validate_images
      return unless images.attached?

      max_imgs = SpreeProductReviews.config.max_images_upload rescue 5
      max_imgs = 5 if max_imgs.nil? || max_imgs <= 0

      if images.count > max_imgs
        errors.add(:images, "Maximum #{max_imgs} images allowed")
      end

      max_mb = SpreeProductReviews.config.max_image_size_mb rescue 5
      max_mb = 5 if max_mb.nil? || max_mb <= 0
      max_bytes = max_mb.megabytes

      images.each do |image|
        if image.blob.byte_size > max_bytes
          errors.add(:images, "Each image must be smaller than #{max_mb}MB")
        end

        allowed_types = %w[image/jpeg image/png image/webp]
        unless allowed_types.include?(image.blob.content_type)
          errors.add(:images, "Invalid format (#{image.blob.content_type}). Allowed: JPEG, PNG, WebP")
        end
      end
    end
  end
end

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
    attribute :helpful_count, :integer, default: 0
    attribute :unhelpful_count, :integer, default: 0

    scope :approved, -> { where(approved: true, spam: false) }
    scope :pending, -> { where(approved: false, spam: false) }
    scope :spam, -> { where(spam: true) }
    scope :rejected, -> { where(approved: false) }
    scope :verified, -> { where(verified_purchaser: true) }
    scope :by_rating, ->(r) { where(rating: r) }
    scope :newest, -> { order(created_at: :desc) }
    scope :highest_rating, -> { order(rating: :desc, created_at: :desc) }
    scope :lowest_rating, -> { order(rating: :asc, created_at: :desc) }
    scope :most_helpful, -> { order(helpful_count: :desc, created_at: :desc) }

    before_create :evaluate_verified_purchaser
    after_save :recalculate_product_rating, if: -> { saved_change_to_approved? || saved_change_to_spam? || saved_change_to_rating? }
    after_destroy :recalculate_product_rating

    def pending?
      !approved? && !spam?
    end

    def approve!
      update(approved: true, spam: false)
    end

    def reject!
      update(approved: false)
    end

    def mark_spam!
      update(spam: true, approved: false)
    end

    def unmark_spam!
      update(spam: false)
    end

    def reviewer_name
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
      completed_orders = Spree::Order.where(state: 'complete')

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

      approved_reviews = product.reviews.approved
      count = approved_reviews.count
      avg = count.positive? ? approved_reviews.average(:rating).to_f.round(2) : 0.0

      product.update_columns(average_rating: avg, review_count: count)
    rescue StandardError => e
      Rails.logger.error("[SpreeProductReviews] Rating recalculation failed: #{e.message}")
    end

    def vote!(helpful:, customer_id: nil, user_id: nil, ip_address: nil)
      vote = votes.find_or_initialize_by(
        customer_id: customer_id,
        user_id: user_id,
        ip_address: (customer_id || user_id) ? nil : ip_address
      )
      vote.helpful = helpful
      vote.save!
    end

    private

    def mask_email(email)
      parts = email.split('@')
      name = parts.first
      domain = parts.last
      masked_name = name.length > 2 ? "#{name[0]}***#{name[-1]}" : "#{name[0]}***"
      "#{masked_name}@#{domain}"
    end

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

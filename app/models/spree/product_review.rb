module Spree
  class ProductReview < Spree::Base
    belongs_to :product, class_name: "Spree::Product"
    belongs_to :user, class_name: Spree.user_class.to_s
    belongs_to :variant, class_name: "Spree::Variant", optional: true

    has_many_attached :images, dependent: :purge_later

    validates :product, presence: true
    validates :user, presence: true
    validates :rating, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 5 }
    validates :title, presence: true
    validates :review, presence: true
    attribute :show_identifier, :boolean, default: true

    scope :approved, -> { where(approved: true) }
    scope :pending, -> { where(approved: false) }

    def pending?
      !approved?
    end

    def approve!
      update(approved: true)
    end

    def reject!
      update(approved: false)
    end

    def reviewer_name
      if user&.name && show_identifier
        user.name
      else
        "Anonymous"
      end
    end

    def review_date
      created_at.strftime("%B %d, %Y at %I:%M%p")
    end
  end
end
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
    validate :validate_max_images
    validate :validate_image_size
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

    def validate_max_images
      return unless images.attached?
    
      section = Spree::PageSections::AddAReview.first
      max = section&.preferred_max_images_upload || 5
    
      if images.count > max
        errors.add(:images, "Maximum #{max} images allowed")
      end
    end

    def validate_image_size
      return unless images.attached?
    
      section = Spree::PageSections::AddAReview.first
      max_mb = section&.preferred_max_image_size_mb || 5
      max_bytes = max_mb.megabytes
    
      images.each do |image|
        if image.blob.byte_size > max_bytes
          errors.add(
            :images,
            "Each image must be smaller than #{max_mb}MB"
          )
        end
      end
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
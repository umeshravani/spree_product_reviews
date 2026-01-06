module SpreeProductReviews
  module Spree
    module ProductReviewDecorator
      def self.prepended(base)
        base.has_many_attached :images
        base._validators.delete(:images)
        base.reset_callbacks(:validate)
        base.validates :rating, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 5 }
        base.validates :review, presence: true
        base.validates :product_name, presence: true
        base.validate :validate_media_files
      end

      private

      def validate_media_files
        return unless images.attached?

        images.each do |file|
          allowed_types = %w[
            image/jpeg image/png image/webp image/gif 
            video/mp4 video/quicktime video/webm
          ]
          
          unless file.content_type.in?(allowed_types)
            errors.add(:images, "File '#{file.filename}' is not a valid format.")
          end

          limit = file.content_type.start_with?('video') ? 50.megabytes : 10.megabytes
          
          if file.blob.byte_size > limit
            errors.add(:images, "File '#{file.filename}' is too large. Limit is #{limit / 1.megabyte}MB.")
          end
        end
      end
    end
  end
end

::Spree::ProductReview.prepend SpreeProductReviews::Spree::ProductReviewDecorator

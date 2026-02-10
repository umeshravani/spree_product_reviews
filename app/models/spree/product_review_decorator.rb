module Spree
    module ProductReviewDecorator
      def self.prepended(base)
        base.class_eval do
          # Ransack 4.0+ Security (Fixes Admin Search Crash)
          def self.ransackable_attributes(auth_object = nil)
            %w[
              approved created_at id locale name rating review spam title 
              updated_at user_id product_id ip_address
            ]
          end
  
          def self.ransackable_associations(auth_object = nil)
            %w[images_attachments images_blobs product user]
          end
  
          # Media Attachments & Validation (Fixes Video/Image Uploads)
          # This moves the logic out of the controller into the model where it belongs.
          
          has_many_attached :images
          
          # Remove default Spree validators (which enforce 5MB / images only)
          # to allow our custom logic for larger videos/images.
          _validators.delete(:images) if _validators.key?(:images)
          
          validate :validate_media_content_type
  
          def validate_media_content_type
            return unless images.attached?
            
            # Allow both Images and Video formats
            allowed_types = %w[
              image/jpeg image/png image/webp image/gif 
              video/mp4 video/quicktime video/webm
            ]
            
            images.each do |file|
              unless file.content_type.in?(allowed_types)
                errors.add(:images, "Invalid format. Allowed: JPG, PNG, WEBP, GIF, MP4, MOV, WEBM")
              end
              
              # We can Add specific size validation here if needed (Optional)
              # limit = file.content_type.start_with?('video') ? 50.megabytes : 10.megabytes
              # errors.add(:images, "File too large") if file.byte_size > limit
            end
          end
        end
      end
    end
  end
  
  # Safely prepend the decorator to the main class
  ::Spree::ProductReview.prepend(Spree::ProductReviewDecorator) if defined?(::Spree::ProductReview)

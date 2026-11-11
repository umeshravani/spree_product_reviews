module Spree
  class ReviewMedia < Spree.base_class
    self.table_name = 'spree_review_media'

    has_prefix_id :rmedia

    IMAGE_CONTENT_TYPES = %w[
      image/avif
      image/gif
      image/jpeg
      image/png
      image/webp
    ].freeze

    VIDEO_CONTENT_TYPES = %w[
      video/mp4
      video/quicktime
      video/webm
      video/ogg
    ].freeze

    ALLOWED_CONTENT_TYPES = (IMAGE_CONTENT_TYPES + VIDEO_CONTENT_TYPES).freeze

    attribute :position, :integer, default: 0

    belongs_to :review, class_name: 'Spree::Review', inverse_of: :review_media, touch: true
    has_one_attached :attachment, service: Spree.public_storage_service_name

    acts_as_list scope: :review

    validates :review, presence: true
    validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
    validates :attachment, attached: true, content_type: ALLOWED_CONTENT_TYPES
    validate :attachment_type_permitted
    validate :attachment_size_within_limit
    validate :review_media_count_within_limit, on: :create

    def video?
      attachment.attached? && VIDEO_CONTENT_TYPES.include?(attachment.blob&.content_type.to_s.downcase)
    end

    def image?
      attachment.attached? && IMAGE_CONTENT_TYPES.include?(attachment.blob&.content_type.to_s.downcase)
    end

    def media_type
      video? ? 'video' : 'image'
    end

    private

    def store_settings
      @store_settings ||= Spree::ReviewSetting.for_store(review&.store)
    end

    def attachment_type_permitted
      return unless attachment.attached? && video?
      return if store_settings[:allow_videos]

      errors.add(:attachment, 'Video uploads are currently disabled for reviews.')
    end

    def attachment_size_within_limit
      return unless attachment.attached?

      max_mb = if video?
                 store_settings[:max_video_size_megabytes].to_i
               else
                 store_settings[:max_image_size_megabytes].to_i
               end
      max_size = max_mb.megabytes
      return if max_size <= 0
      return if attachment.blob.byte_size <= max_size

      errors.add(:attachment, :too_large, count: ActiveSupport::NumberHelper.number_to_human_size(max_size))
    end

    def review_media_count_within_limit
      return if review.blank? || !review.persisted?

      max_images = store_settings[:max_images_per_review].to_i
      return if max_images <= 0

      marked_ids = review.review_media.select(&:marked_for_destruction?).filter_map(&:id)
      scope = review.review_media.where.not(id: id)
      scope = scope.where.not(id: marked_ids) if marked_ids.any?
      return if scope.count < max_images

      errors.add(:review, :too_long, count: max_images)
    end
  end
end

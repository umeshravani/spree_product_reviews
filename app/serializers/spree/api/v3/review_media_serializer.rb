module Spree
  module Api
    module V3
      class ReviewMediaSerializer < BaseSerializer
        typelize position: :number,
                 alt: [:string, nullable: true],
                 url: [:string, nullable: true],
                 content_type: [:string, nullable: true],
                 byte_size: [:number, nullable: true],
                 media_type: :string,
                 filename: [:string, nullable: true]

        attributes :position, :alt

        attribute :url do |review_media|
          next unless review_media.attachment.attached?

          Rails.application.routes.url_helpers.cdn_image_url(review_media.attachment)
        end

        attribute :content_type do |review_media|
          review_media.attachment.blob&.content_type if review_media.attachment.attached?
        end

        attribute :byte_size do |review_media|
          review_media.attachment.blob&.byte_size if review_media.attachment.attached?
        end

        attribute :media_type do |review_media|
          review_media.media_type
        end

        attribute :filename do |review_media|
          review_media.attachment.filename.to_s if review_media.attachment.attached?
        end
      end
    end
  end
end

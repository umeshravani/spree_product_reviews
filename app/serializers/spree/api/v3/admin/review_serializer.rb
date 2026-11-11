module Spree
  module Api
    module V3
      module Admin
        class ReviewSerializer < V3::ReviewSerializer
          typelize store_id: :string,
                   customer_id: [:string, nullable: true],
                   order_id: [:string, nullable: true],
                   product_name: [:string, nullable: true],
                   product_slug: [:string, nullable: true],
                   product_thumbnail_url: [:string, nullable: true],
                   reviewer_name: [:string, nullable: true],
                   ip_address: [:string, nullable: true],
                   hidden: :boolean,
                   spam: :boolean,
                   spam_score: :number,
                   flagged_count: :number,
                   moderated_at: [:string, nullable: true],
                   moderator_name: [:string, nullable: true],
                   moderator_note: [:string, nullable: true],
                   discarded_at: [:string, nullable: true],
                   reward_code: [:string, nullable: true],
                   reward_amount: [:string, nullable: true],
                   reward_gift_card_id: [:string, nullable: true],
                   metadata: 'Record<string, unknown>',
                   public_metadata: 'Record<string, unknown>'

          attributes :reviewer_name, :ip_address, :hidden, :spam, :spam_score,
                     :flagged_count, :moderator_name, :moderator_note,
                     :reward_code, :metadata, :public_metadata,
                     moderated_at: :iso8601, discarded_at: :iso8601,
                     created_at: :iso8601, updated_at: :iso8601

          attribute :store_id do |review|
            review.store.prefixed_id
          end

          attribute :customer_id do |review|
            review.customer&.prefixed_id
          end

          attribute :order_id do |review|
            review.attributed_order&.prefixed_id
          end

          attribute :product_name do |review|
            review.product&.name
          end

          attribute :product_slug do |review|
            review.product&.slug
          end

          attribute :product_thumbnail_url do |review|
            product = review.product
            next unless product

            media = product.try(:primary_media) || product.try(:media)&.first
            attachment = media&.try(:attachment)
            if attachment&.attached?
              Rails.application.routes.url_helpers.cdn_image_url(attachment)
            end
          rescue StandardError
            nil
          end

          attribute :reviewer_name do |review|
            review.admin_reviewer_name
          end

          attribute :reward_code do |review|
            review.reward_code
          end

          attribute :reward_amount do |review|
            review.reward_amount&.to_s
          end

          attribute :reward_gift_card_id do |review|
            review.gift_card&.prefixed_id
          end

          attribute :moderation_audits do |review|
            review.moderation_audits.recent_first.limit(20).map do |audit|
              {
                id: audit.prefixed_id,
                action: audit.action,
                moderator_name: audit.moderator_name,
                note: audit.note,
                created_at: audit.created_at&.iso8601
              }
            end
          end

          attribute :reports do |review|
            review.reports.order(created_at: :desc).limit(20).map do |report|
              {
                id: report.prefixed_id,
                reason: report.reason,
                details: report.details,
                created_at: report.created_at&.iso8601
              }
            end
          end

          many :review_media,
               key: :media,
               resource: Spree::Api::V3::ReviewMediaSerializer

          many :answers,
               resource: Spree::Api::V3::ReviewAnswerSerializer
        end
      end
    end
  end
end

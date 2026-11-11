module Spree
  module Api
    module V3
      class ReviewSerializer < BaseSerializer
        typelize product_id: :string,
                 variant_id: [:string, nullable: true],
                 purchased_option_values: [:string, multi: true],
                 rating: :number,
                 title: :string,
                 body: :string,
                 status: :string,
                 verified_purchase: :boolean,
                 show_identifier: :boolean,
                 reviewer_display_name: :string,
                 locale: [:string, nullable: true],
                 helpful_count: :number,
                 not_helpful_count: :number,
                 flagged_count: :number,
                 current_vote: [:string, nullable: true],
                 reward_code: [:string, nullable: true],
                 reward_amount: [:string, nullable: true],
                 created_at: :string,
                 media: ['ReviewMedia', multi: true],
                 answers: ['ReviewAnswer', multi: true]

        attributes :rating, :title, :body, :status, :verified_purchase, :show_identifier,
                   :locale, :helpful_count, :not_helpful_count, :flagged_count,
                   created_at: :iso8601, updated_at: :iso8601

        attribute :product_id do |review|
          review.product.prefixed_id
        end

        attribute :variant_id do |review|
          review.variant&.prefixed_id
        end

        attribute :purchased_option_values do |review|
          variant = review.variant

          if variant.present?
            variant.option_values.
              sort_by { |option_value| option_value_order(option_value) }.
              filter_map do |option_value|
                option_value.label.presence || option_value.name.presence
              end
          else
            []
          end
        end

        attribute :reviewer_display_name do |review|
          review.reviewer_display_name
        end

        attribute :current_vote do |review|
          review.current_vote_for(customer: current_user, ip_address: params[:ip_address])
        end

        attribute :reward_code do |review|
          review.reward_code if current_user.present? && review.customer_id == current_user.id
        end

        attribute :reward_amount do |review|
          review.reward_amount&.to_s if current_user.present? && review.customer_id == current_user.id
        end

        many :review_media,
             key: :media,
             resource: Spree::Api::V3::ReviewMediaSerializer

        many :answers,
             resource: Spree::Api::V3::ReviewAnswerSerializer

        private

        def option_value_order(option_value)
          [
            option_value.option_type&.position || 0,
            option_value.position || 0,
            option_value.id || 0
          ]
        end
      end
    end
  end
end

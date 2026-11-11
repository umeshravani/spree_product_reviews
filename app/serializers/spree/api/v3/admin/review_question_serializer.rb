module Spree
  module Api
    module V3
      module Admin
        class ReviewQuestionSerializer < BaseSerializer
          typelize store_id: :string,
                   product_id: [:string, nullable: true],
                   category_id: [:string, nullable: true],
                   key: :string,
                   label: :string,
                   kind: :string,
                   applies_to: :string,
                   filterable: :boolean,
                   required: :boolean,
                   active: :boolean,
                   position: :number,
                   options: ['ReviewQuestionOption', multi: true]

          attributes :key, :label, :kind, :applies_to,
                     :filterable, :required, :active, :position,
                     created_at: :iso8601, updated_at: :iso8601

          attribute :store_id do |question|
            question.store.prefixed_id
          end

          attribute :product_id do |question|
            question.product&.prefixed_id
          end

          attribute :category_id do |question|
            question.category&.prefixed_id
          end

          many :options,
               resource: Spree::Api::V3::Admin::ReviewQuestionOptionSerializer
        end
      end
    end
  end
end

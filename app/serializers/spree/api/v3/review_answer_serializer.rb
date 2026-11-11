module Spree
  module Api
    module V3
      class ReviewAnswerSerializer < BaseSerializer
        typelize question_id: :string,
                 question_key: :string,
                 question_label: :string,
                 kind: :string,
                 option_id: [:string, nullable: true],
                 value: [:string, :number, :boolean, nullable: true],
                 label: [:string, nullable: true]

        attribute :question_id do |answer|
          answer.question.prefixed_id
        end

        attribute :question_key do |answer|
          answer.question.key
        end

        attribute :question_label do |answer|
          answer.question.label
        end

        attribute :kind do |answer|
          answer.question.kind
        end

        attribute :option_id do |answer|
          answer.option&.prefixed_id
        end

        attribute :value do |answer|
          answer.value
        end

        attribute :label do |answer|
          answer.option&.label || answer.value
        end
      end
    end
  end
end

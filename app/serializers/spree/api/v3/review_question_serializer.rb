module Spree
  module Api
    module V3
      class ReviewQuestionSerializer < BaseSerializer
        typelize key: :string,
                 label: :string,
                 kind: :string,
                 applies_to: :string,
                 filterable: :boolean,
                 required: :boolean,
                 position: :number,
                 options: ['ReviewQuestionOption', multi: true]

        attributes :key, :label, :kind, :applies_to, :filterable, :required, :position

        many :options,
             resource: Spree::Api::V3::ReviewQuestionOptionSerializer
      end
    end
  end
end

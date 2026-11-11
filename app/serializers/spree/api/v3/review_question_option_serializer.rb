module Spree
  module Api
    module V3
      class ReviewQuestionOptionSerializer < BaseSerializer
        typelize value: :string,
                 label: :string,
                 position: :number

        attributes :value, :label, :position
      end
    end
  end
end

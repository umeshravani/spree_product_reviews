module Spree
  module Api
    module V3
      module Admin
        class ReviewQuestionOptionSerializer < BaseSerializer
          typelize value: :string,
                   label: :string,
                   active: :boolean,
                   position: :number

          attributes :value, :label, :active, :position,
                     created_at: :iso8601, updated_at: :iso8601
        end
      end
    end
  end
end

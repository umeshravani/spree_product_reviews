module Spree
  module Api
    module V3
      module Admin
        class ReviewQuestionOptionsController < ResourceController
          scoped_resource :reviews

          protected

          def set_parent
            @parent = Spree::ReviewQuestion.for_store(current_store).find_by_prefix_id!(params[:review_question_id])
          end

          def parent_association
            :options
          end

          def model_class
            Spree::ReviewQuestionOption
          end

          def serializer_class
            Spree::Api::V3::Admin::ReviewQuestionOptionSerializer
          end

          def apply_collection_sort(collection)
            return collection if params[:sort].present?

            collection.ordered
          end

          def permitted_params
            normalize_params(params.permit(:value, :label, :active, :position))
          end
        end
      end
    end
  end
end

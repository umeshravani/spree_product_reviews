module Spree
  module Api
    module V3
      module Admin
        class ReviewQuestionsController < ResourceController
          scoped_resource :reviews

          protected

          def resource_scope
            model_class.for_store(current_store)
          end

          def model_class
            Spree::ReviewQuestion
          end

          def serializer_class
            Spree::Api::V3::Admin::ReviewQuestionSerializer
          end

          def scope_includes
            [:product, :category, :options]
          end

          def apply_collection_sort(collection)
            return collection if params[:sort].present?

            collection.ordered
          end

          def permitted_params
            normalized = normalize_params(
              params.permit(
                :key, :label, :kind, :applies_to,
                :filterable, :required, :active, :position,
                :product_id, :category_id,
                options: [
                  :id, :value, :label, :active, :position, :_destroy
                ]
              )
            )

            decode_nested_ids(normalized, :options_attributes)
            normalized
          end

          private

          def decode_nested_ids(params_hash, key)
            Array(params_hash[key]).each do |attributes|
              id = attributes[:id]
              next unless Spree::PrefixedId.prefixed_id?(id)

              attributes[:id] = Spree::PrefixedId.decode_prefixed_id(id)
            end
          end
        end
      end
    end
  end
end

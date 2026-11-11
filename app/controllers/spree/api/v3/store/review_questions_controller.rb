module Spree
  module Api
    module V3
      module Store
        class ReviewQuestionsController < Store::BaseController
          include Spree::Api::V3::Store::ReviewProductLookup

          # GET /api/v3/store/products/:product_id/reviews/questions
          def index
            unless Spree::ReviewSetting.for_store(current_store)[:enabled]
              return render json: { data: [] }
            end

            questions = Spree::ReviewQuestion.for_product(@product, store: current_store).includes(:options)

            render json: {
              data: questions.map { |question| Spree::Api::V3::ReviewQuestionSerializer.new(question).to_h }
            }
          end
        end
      end
    end
  end
end

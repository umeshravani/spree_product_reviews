module Spree
  module Api
    module V3
      module Store
        class ReviewSettingsController < Store::BaseController
          # GET /api/v3/store/reviews/settings
          def show
            render json: {
              data: Spree::ReviewSetting.public_hash(current_store)
            }, status: :ok
          end
        end
      end
    end
  end
end


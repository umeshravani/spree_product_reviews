module Spree
  module Api
    module V3
      module Store
        class ProductReviewSummariesController < Store::BaseController
          # GET /api/v3/store/products/review_summaries?product_ids=prod_1,prod_2
          def index
            settings = Spree::ReviewSetting.for_store(current_store)
            raw_ids = Array(params[:product_ids].is_a?(String) ? params[:product_ids].split(',') : params[:product_ids]).
                      map { |id| id.to_s.strip }.
                      reject(&:blank?).
                      uniq.
                      first(100)

            return render json: { data: {} } if raw_ids.empty? || !settings[:enabled]

            products = Spree::Product.for_store(current_store).where(id: decoded_ids(raw_ids)).index_by(&:id)
            summaries = Spree::ProductReviewSummary.where(store: current_store, product_id: products.keys).index_by(&:product_id)

            payload = {}
            products.each do |id, product|
              summary = summaries[id]
              payload[product.prefixed_id] = {
                product_id: product.prefixed_id,
                average_rating: summary&.average_rating.to_f,
                reviews_count: summary&.reviews_count.to_i
              }
            end

            render json: { data: payload }
          end

          private

          def decoded_ids(raw_ids)
            raw_ids.filter_map do |raw_id|
              if Spree::PrefixedId.prefixed_id?(raw_id)
                Spree::Product.find_by_prefix_id(raw_id)&.id
              elsif Spree::Product.columns_hash['id']&.type == :integer
                Integer(raw_id, 10) rescue nil
              else
                raw_id
              end
            end
          end
        end
      end
    end
  end
end


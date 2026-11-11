module Spree
  module Api
    module V3
      module Store
        module ReviewProductLookup
          extend ActiveSupport::Concern
          include Spree::Api::V3::Store::StorefrontProducts

          included do
            before_action :set_product
          end

          private

          def set_product
            @product = product_scope.then do |scope|
              if params[:product_id].to_s.start_with?('prod_')
                scope.find_by_prefix_id!(params[:product_id])
              else
                scope.i18n.find_by!(slug: params[:product_id])
              end
            end
          end

          def product_scope
            storefront_products(Spree::Product.for_store(current_store))
          end

          def review_variant
            return @review_variant if defined?(@review_variant)

            variant_id = params[:variant_id].presence
            @review_variant = variant_id.present? ? find_product_variant!(variant_id) : nil
          end

          def find_product_variant!(variant_id)
            scope = Spree::Variant.where(product_id: @product.id)

            if Spree::PrefixedId.prefixed_id?(variant_id)
              scope.find_by_prefix_id!(variant_id)
            else
              scope.find(variant_id)
            end
          end

          def review_order
            return @review_order if defined?(@review_order)

            order_id = params[:order_id].presence
            @review_order = order_id.present? && current_user.present? ? find_customer_order!(order_id) : nil
          end

          def find_customer_order!(order_id)
            scope = Spree::Order.complete.where(customer_id: current_user.id, store_id: current_store.id)

            if Spree::PrefixedId.prefixed_id?(order_id)
              scope.find_by_prefix_id!(order_id)
            else
              scope.find(order_id)
            end
          end
        end
      end
    end
  end
end

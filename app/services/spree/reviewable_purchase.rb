module Spree
  class ReviewablePurchase
    REVIEWABLE_FULFILLMENT_STATUSES = %w[shipped returned].freeze

    attr_reader :order, :product, :variant

    def initialize(order:, product:, variant: nil)
      @order = order
      @product = product
      @variant = variant
    end

    def reviewable?
      reviewable_variant_ids.any?
    end

    def reviewable_variant?(candidate_variant)
      candidate_variant.present? && reviewable_variant_ids.include?(candidate_variant.id)
    end

    def reviewable_variant_ids
      return [] unless order&.completed_at.present? && !order.canceled? && product.present?

      @reviewable_variant_ids ||= candidate_variant_ids.select do |variant_id|
        reviewable_quantity_for_variant_id(variant_id).positive?
      end
    end

    def target_variant
      return variant if variant.present? && reviewable_variant?(variant)

      variant_ids = reviewable_variant_ids
      return unless variant_ids.one?

      line_items.find { |line_item| line_item.variant_id == variant_ids.first }&.variant
    end

    private

    def candidate_variant_ids
      line_items.filter_map do |line_item|
        next unless line_item.variant&.product_id == product.id
        next if variant.present? && line_item.variant_id != variant.id

        line_item.variant_id
      end.uniq
    end

    def reviewable_quantity_for_variant_id(variant_id)
      fulfillment_items.select { |item| item.variant_id == variant_id }.sum do |item|
        next 0 unless REVIEWABLE_FULFILLMENT_STATUSES.include?(item.status)

        returned = item.return_line_items.sum do |return_line|
          return_line.return.counted? ? return_line.received_quantity.to_i : 0
        end
        [item.quantity.to_i - returned, 0].max
      end
    end

    def line_items
      @line_items ||= order.line_items.includes(:variant).to_a
    end

    def fulfillment_items
      @fulfillment_items ||= order.fulfillment_items.includes(return_line_items: :return).to_a
    end
  end
end

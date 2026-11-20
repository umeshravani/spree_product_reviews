# frozen_string_literal: true

module Spree
  class ProductQuestion < Spree.base_class
    self.table_name = 'spree_product_questions'

    has_prefix_id :prdq

    STATUSES = %w[pending answered approved rejected].freeze

    belongs_to :store, class_name: 'Spree::Store'
    belongs_to :product, class_name: 'Spree::Product'

    validates :store, :product, :author_name, :author_email, :question, presence: true
    validates :status, inclusion: { in: STATUSES }

    scope :for_store, ->(store) { where(store: store) }
    scope :for_product, ->(product) { where(product: product) }
    scope :ordered, -> { order(created_at: :desc) }
    scope :pending, -> { where(status: 'pending') }
    scope :visible_to_public, -> { where(status: %w[answered approved]).where.not(answer: [nil, '']) }

    self.whitelisted_ransackable_attributes = %w[
      id author_name author_email question answer status created_at answered_at product_id store_id
    ]
    self.whitelisted_ransackable_associations = %w[product store]

    def mark_answered!(answer_text, answered_by_name: nil)
      update!(
        answer: answer_text,
        answered_by: answered_by_name.presence || 'Store Team',
        status: 'answered',
        answered_at: Time.current
      )
    end

    def verified_purchase?
      return false if author_email.blank? || product.blank?

      variant_ids = product.variants.pluck(:id)
      return false if variant_ids.empty?

      Spree::Order.complete
                  .where(store_id: store_id, email: author_email)
                  .joins(:line_items)
                  .where(spree_line_items: { variant_id: variant_ids })
                  .exists?
    rescue StandardError
      false
    end

    alias verified_purchase verified_purchase?
  end
end

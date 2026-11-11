require 'spec_helper'

RSpec.describe Spree::ReviewablePurchase, type: :service do
  let(:store) { create(:store) }
  let(:product) { create(:product, store: store) }
  let(:customer) { create(:customer) }
  let(:variant) { product.default_variant }

  def purchase(order, variant: self.variant)
    described_class.new(order: order, product: product, variant: variant)
  end

  def return_item(order, variant:, quantity:, status: 'received')
    item = order.fulfillment_items.find_by!(variant: variant)
    line = build(:return_line_item, fulfillment_item: item, line_item: item.line_item,
                                    variant: variant, quantity: quantity)
    create(:return, order: order, store: store, status: status, return_line_items: [line]).tap do |record|
      record.return_line_items.first.update!(received_quantity: quantity) if record.counted?
    end
  end

  it 'accepts a shipped variant' do
    order = create(:shipped_order, customer: customer, store: store, variants: [variant])

    expect(purchase(order)).to be_reviewable
    expect(purchase(order).target_variant).to eq(variant)
  end

  it 'rejects variants which have not shipped even when another variant has' do
    other_variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: customer, store: store, variants: [variant, other_variant])
    order.fulfillment_items.find_by!(variant: other_variant).update!(status: 'on_hand')

    expect(purchase(order, variant: variant)).to be_reviewable
    expect(purchase(order, variant: other_variant)).not_to be_reviewable
    expect(purchase(order, variant: nil).reviewable_variant_ids).to contain_exactly(variant.id)
  end

  it 'rejects canceled orders' do
    order = create(:shipped_order, customer: customer, store: store, variants: [variant])
    order.update_columns(status: 'canceled')

    expect(purchase(order)).not_to be_reviewable
  end

  it 'rejects fully returned variants while keeping other variants eligible' do
    other_variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: customer, store: store, variants: [variant, other_variant])
    return_item(order, variant: variant, quantity: 1)

    expect(purchase(order, variant: variant)).not_to be_reviewable
    expect(purchase(order, variant: other_variant)).to be_reviewable
    expect(purchase(order, variant: nil).target_variant).to eq(other_variant)
  end

  it 'keeps a partially retained quantity eligible' do
    order = create(:shipped_order, customer: customer, store: store, variants: [variant])
    order.fulfillment_items.find_by!(variant: variant).update!(quantity: 2)
    return_item(order, variant: variant, quantity: 1)

    expect(purchase(order)).to be_reviewable
  end

  it 'does not subtract requested or canceled returns' do
    order = create(:shipped_order, customer: customer, store: store, variants: [variant])
    return_item(order, variant: variant, quantity: 1, status: 'requested')
    return_item(order, variant: variant, quantity: 1, status: 'canceled')

    expect(purchase(order)).to be_reviewable
  end

  it 'does not accept a variant from a different product' do
    other = create(:product, store: store).default_variant
    order = create(:shipped_order, customer: customer, store: store, variants: [variant, other])

    expect(purchase(order, variant: other)).not_to be_reviewable
  end
end

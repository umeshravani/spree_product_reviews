require 'spec_helper'

RSpec.describe Spree::ReviewVerifiedPurchaseStatus, type: :service do
  let(:store) { create(:store) }
  let(:product) { create(:product, store: store) }
  let(:user) { create(:user) }

  it 'marks an existing review unverified when its order variant is fully returned' do
    variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [variant])
    review = create(
      :review,
      :verified_purchase,
      :for_variant,
      product: product,
      variant: variant,
      order: order,
      store: store,
      customer: user
    )
    create_received_return_item(order: order, variant: variant)

    expect(described_class.sync!(review)).to be(true)
    expect(review.reload.verified_purchase).to be(false)
  end

  it 'keeps an existing review verified when the same variant still has retained quantity' do
    variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [variant])
    line_item = order.line_items.find_by!(variant: variant)
    inventory_unit = order.fulfillment_items.find_by!(line_item: line_item, variant: variant)
    line_item.update!(quantity: 2)
    inventory_unit.update!(quantity: 2)
    review = create(
      :review,
      :verified_purchase,
      :for_variant,
      product: product,
      variant: variant,
      order: order,
      store: store,
      customer: user
    )
    create_received_return_item(order: order, variant: variant, quantity: 1)

    expect(described_class.sync!(review)).to be(false)
    expect(review.reload.verified_purchase).to be(true)
  end

  it 'does not change a review for another retained variant in the same order' do
    reviewed_variant = create(:reviewable_variant, product: product)
    returned_variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [reviewed_variant, returned_variant])
    review = create(
      :review,
      :verified_purchase,
      :for_variant,
      product: product,
      variant: reviewed_variant,
      order: order,
      store: store,
      customer: user
    )
    create_received_return_item(order: order, variant: returned_variant)

    expect(described_class.sync_for_order_variant!(order: order, variant: returned_variant)).to eq(0)
    expect(review.reload.verified_purchase).to be(true)
  end

  it 'keeps an ambiguous product-level review verified while any matching variant is retained' do
    returned_variant = create(:reviewable_variant, product: product)
    kept_variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [returned_variant, kept_variant])
    review = create(:review, :verified_purchase, product: product, variant: nil, order: order, store: store, customer: user)
    create_received_return_item(order: order, variant: returned_variant)

    expect(described_class.sync_for_order_variant!(order: order, variant: returned_variant)).to eq(0)
    expect(review.reload.verified_purchase).to be(true)
  end

  it 'marks an ambiguous product-level review unverified when all matching variants are returned' do
    first_variant = create(:reviewable_variant, product: product)
    second_variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [first_variant, second_variant])
    review = create(:review, :verified_purchase, product: product, variant: nil, order: order, store: store, customer: user)
    create_received_return_item(order: order, variant: first_variant)
    create_received_return_item(order: order, variant: second_variant)

    expect(described_class.sync!(review)).to be(true)
    expect(review.reload.verified_purchase).to be(false)
  end

  it 'can promote a purchased review that was not previously marked verified' do
    variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [variant])
    review = create(:review, :for_variant, product: product, variant: variant, order: order, store: store, customer: user)

    expect(described_class.sync!(review)).to be(true)
    expect(review.reload.verified_purchase).to be(true)
  end
  it 'does not verify a review attached to another customer’s order' do
    variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [variant])
    review = create(:review, :for_variant, product: product, variant: variant, order: order, store: store, customer: user)
    review.update_column(:customer_id, create(:customer).id)

    expect(described_class.verified_purchase?(review.reload)).to be(false)
  end

end

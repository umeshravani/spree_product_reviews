require 'spec_helper'

RSpec.describe Spree::ReviewPurchaseAttribution, type: :service do
  let(:store) { create(:store) }
  let(:product) { create(:product, store: store) }
  let(:user) { create(:user) }

  it 'backfills a legacy review with the matching shipped order and unambiguous variant' do
    variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [variant])

    review = create(:review, product: product, store: store, customer: user, order: nil, variant: nil)

    expect(described_class.new(review).call).to be(true)
    expect(review.reload.order).to eq(order)
    expect(review.variant).to eq(variant)
  end

  it 'leaves the variant blank when an order has multiple variants for the same product' do
    first_variant = create(:reviewable_variant, product: product)
    second_variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [first_variant, second_variant])

    review = create(:review, product: product, store: store, customer: user, order: nil, variant: nil)

    expect(described_class.new(review).call).to be(true)
    expect(review.reload.order).to eq(order)
    expect(review.variant).to be_nil
  end

  it 'skips backfill when the matching purchase already has a review' do
    variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [variant])

    create(:review, :for_variant, product: product, store: store, customer: user, order: order, variant: variant)
    review = create(:review, product: product, store: store, customer: user, order: nil, variant: nil)

    expect(described_class.new(review).call).to be(false)
    expect(review.reload.order).to be_nil
    expect(review.variant).to be_nil
  end

  it 'skips fully returned purchases when backfilling legacy reviews' do
    variant = create(:reviewable_variant, product: product)
    returned_order = create(:shipped_order, customer: user, store: store, variants: [variant])
    kept_order = create(:shipped_order, customer: user, store: store, variants: [variant])
    returned_order.update!(completed_at: 3.days.ago)
    kept_order.update!(completed_at: 1.day.ago)
    create_received_return_item(order: returned_order, variant: variant)
    review = create(
      :review,
      product: product,
      store: store,
      customer: user,
      order: nil,
      variant: nil,
      created_at: 2.days.ago,
      updated_at: 2.days.ago
    )

    expect(described_class.new(review).call).to be(true)
    expect(review.reload.order).to eq(kept_order)
    expect(review.variant).to eq(variant)
  end
end

require 'spec_helper'

RSpec.describe Spree::ReviewEligibility, type: :model do
  let(:store) { create(:store) }
  let(:product) { create(:product, store: store) }
  let(:user) { create(:user) }

  subject(:eligibility) { described_class.new(product: product, store: store, customer: user) }

  it 'requires authentication' do
    eligibility = described_class.new(product: product, store: store, customer: nil)

    expect(eligibility).not_to be_can_review
    expect(eligibility.reason).to eq('login_required')
  end

  it 'requires a shipped order containing the product' do
    create(:order_ready_to_ship, customer: user, store: store, variants: [product.default_variant])

    expect(eligibility).not_to be_can_review
    expect(eligibility.reason).to eq('not_purchased')
    expect(eligibility).not_to be_verified_purchase
  end

  it 'allows customers with a shipped order containing the product' do
    order = create(:shipped_order, customer: user, store: store, variants: [product.default_variant])


    expect(eligibility).to be_can_review
    expect(eligibility.reason).to be_nil
    expect(eligibility).to be_verified_purchase
    expect(eligibility.eligible_order).to eq(order)
  end

  it 'does not allow duplicate reviews by the same customer for the product' do
    order = create(:shipped_order, customer: user, store: store, variants: [product.default_variant])

    review = create(:review, product: product, order: order, store: store, customer: user)

    expect(eligibility).not_to be_can_review
    expect(eligibility.reason).to eq('already_reviewed')
    expect(eligibility.existing_review).to eq(review)
  end

  it 'allows separate reviews for different purchased variants of the same product' do
    variant = create(:reviewable_variant, product: product)
    other_variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [other_variant])
    reviewed_order = create(:shipped_order, customer: user, store: store, variants: [variant])


    create(:review, :for_variant, product: product, variant: variant, order: reviewed_order, store: store, customer: user)

    eligibility = described_class.new(product: product, store: store, customer: user, variant: other_variant, order: order)

    expect(eligibility).to be_can_review
    expect(eligibility.existing_review).to be_nil
  end

  it 'does not allow duplicate reviews for the same purchased variant' do
    variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [variant])

    review = create(:review, :for_variant, product: product, variant: variant, order: order, store: store, customer: user)

    eligibility = described_class.new(product: product, store: store, customer: user, variant: variant, order: order)

    expect(eligibility).not_to be_can_review
    expect(eligibility.reason).to eq('already_reviewed')
    expect(eligibility.existing_review).to eq(review)
  end

  it 'treats legacy product-level reviews as already reviewed for a requested order variant' do
    variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [variant])

    legacy_review = create(:review, product: product, store: store, customer: user, order: nil, variant: nil)

    eligibility = described_class.new(product: product, store: store, customer: user, variant: variant, order: order)

    expect(eligibility).not_to be_can_review
    expect(eligibility.reason).to eq('already_reviewed')
    expect(eligibility.existing_review).to eq(legacy_review)
  end

  it 'allows a later repeat purchase when a legacy review is attributed to an earlier order' do
    variant = create(:reviewable_variant, product: product)
    earlier_order = create(:shipped_order, customer: user, store: store, variants: [variant])
    later_order = create(:shipped_order, customer: user, store: store, variants: [variant])
    earlier_order.update!(completed_at: 3.days.ago)
    later_order.update!(completed_at: 1.day.ago)
    legacy_review = create(
      :review,
      product: product,
      store: store,
      customer: user,
      order: nil,
      variant: nil,
      created_at: 2.days.ago,
      updated_at: 2.days.ago
    )

    earlier_eligibility = described_class.new(
      product: product,
      store: store,
      customer: user,
      variant: variant,
      order: earlier_order
    )
    later_eligibility = described_class.new(
      product: product,
      store: store,
      customer: user,
      variant: variant,
      order: later_order
    )

    expect(earlier_eligibility).not_to be_can_review
    expect(earlier_eligibility.existing_review).to eq(legacy_review)
    expect(later_eligibility).to be_can_review
    expect(later_eligibility.existing_review).to be_nil
  end

  it 'allows the same purchased variant to be reviewed again from a later shipped order' do
    variant = create(:reviewable_variant, product: product)
    first_order = create(:shipped_order, customer: user, store: store, variants: [variant])
    second_order = create(:shipped_order, customer: user, store: store, variants: [variant])


    create(:review, :for_variant, product: product, variant: variant, order: first_order, store: store, customer: user)

    eligibility = described_class.new(product: product, store: store, customer: user, variant: variant, order: second_order)

    expect(eligibility).to be_can_review
    expect(eligibility.eligible_order).to eq(second_order)
    expect(eligibility.existing_review).to be_nil
  end

  it 'chooses a later unreviewed purchase when the variant is omitted' do
    variant = product.default_variant
    available_order = create(:shipped_order, customer: user, store: store, variants: [variant])
    reviewed_order = create(:shipped_order, customer: user, store: store, variants: [variant])
    create(:review, product: product, variant: variant, order: reviewed_order, store: store, customer: user)

    expect(eligibility).to be_can_review
    expect(eligibility.eligible_order).to eq(available_order)
  end

  it 'rejects a requested order that does not contain the requested variant' do
    variant = create(:reviewable_variant, product: product)
    other_variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [other_variant])


    eligibility = described_class.new(product: product, store: store, customer: user, variant: variant, order: order)

    expect(eligibility).not_to be_can_review
    expect(eligibility.reason).to eq('not_purchased')
    expect(eligibility.eligible_order).to be_nil
  end

  it 'rejects a requested variant when that order item was fully returned' do
    variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [variant])

    create_received_return_item(order: order, variant: variant)

    eligibility = described_class.new(product: product, store: store, customer: user, variant: variant, order: order)

    expect(eligibility).not_to be_can_review
    expect(eligibility.reason).to eq('not_purchased')
    expect(eligibility).not_to be_verified_purchase
  end

  it 'keeps an unreturned variant in the same order eligible' do
    returned_variant = create(:reviewable_variant, product: product)
    kept_variant = create(:reviewable_variant, product: product)
    order = create(:shipped_order, customer: user, store: store, variants: [returned_variant, kept_variant])

    create_received_return_item(order: order, variant: returned_variant)

    eligibility = described_class.new(product: product, store: store, customer: user, variant: kept_variant, order: order)

    expect(eligibility).to be_can_review
    expect(eligibility).to be_verified_purchase
    expect(eligibility.eligible_order).to eq(order)
  end

  it 'does not use another customer’s purchase' do
    create(:shipped_order, customer: create(:customer), store: store, variants: [product.default_variant])

    expect(eligibility).not_to be_can_review
    expect(eligibility.reason).to eq('not_purchased')
  end
end

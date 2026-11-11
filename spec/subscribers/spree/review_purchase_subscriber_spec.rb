require 'spec_helper'

RSpec.describe Spree::ReviewPurchaseSubscriber do
  let(:store) { create(:store) }
  let(:product) { create(:product, store: store) }
  let(:customer) { create(:customer) }
  let(:variant) { product.default_variant }
  let(:order) { create(:shipped_order, customer: customer, store: store, variants: [variant]) }
  let!(:review) do
    create(:review, :verified_purchase, product: product, variant: variant, order: order, store: store, customer: customer)
  end

  it 'refreshes reviews on a received return' do
    return_line = create_received_return_item(order: order, variant: variant)

    described_class.call(event_for('return.received', return_line.return))

    expect(review.reload.verified_purchase).to be(false)
  end

  it 'refreshes reviews on order cancellation' do
    order.update_columns(status: 'canceled')

    described_class.call(event_for('order.canceled', order))

    expect(review.reload.verified_purchase).to be(false)
  end

  it 'is registered for a real return receipt event' do
    item = order.fulfillment_items.find_by!(variant: variant)
    line = build(:return_line_item, fulfillment_item: item, line_item: item.line_item, variant: variant)
    return_record = create(:return, order: order, store: store, status: 'approved', return_line_items: [line])

    Spree::Events.enable do
      Spree::Events.activate!
      result = Spree::Returns::Receive.call(return_record: return_record)
      expect(result).to be_success
    end

    expect(review.reload.verified_purchase).to be(false)
  end

  def event_for(name, record)
    Spree::Event.new(name: name, store_id: store.id, payload: { id: record.prefixed_id })
  end
end

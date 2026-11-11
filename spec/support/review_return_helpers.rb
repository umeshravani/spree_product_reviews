module ReviewReturnHelpers
  def create_received_return_item(order:, variant:, quantity: nil)
    item = order.fulfillment_items.find_by!(variant_id: variant.id)
    returned_quantity = quantity || item.quantity
    line = FactoryBot.build(:return_line_item, fulfillment_item: item, line_item: item.line_item,
                                               variant: variant, quantity: returned_quantity)
    record = FactoryBot.create(:return, order: order, store: order.store, status: 'received', return_line_items: [line])
    record.return_line_items.first.tap { |return_line| return_line.update!(received_quantity: returned_quantity) }
  end
end

RSpec.configure do |config|
  config.include ReviewReturnHelpers
end

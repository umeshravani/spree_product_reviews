module Spree
  class ReviewPurchaseSubscriber < Spree::Subscriber
    subscribes_to 'return.received', 'return.refunded', 'return.canceled', 'order.canceled', async: false

    def handle(event)
      order = if event.name == 'order.canceled'
                find_record(Spree::Order, event)
              else
                find_record(Spree::Return, event)&.order
              end

      Spree::ReviewVerifiedPurchaseStatus.sync_for_order!(order) if order.present?
    end

    private

    def find_record(model_class, event)
      id = event.payload['id']
      return if id.blank?

      model_class.find_by_prefix_id(id)
    end
  end
end

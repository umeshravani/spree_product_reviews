require "rails_helper"

RSpec.describe Spree.user_class, type: :model do
  context "product_reviews association" do
    it "has many product_reviews" do
      user = create(:user)
      expect(user).to respond_to(:product_reviews)
    end

    it "destroys associated product_reviews when destroyed" do
      user = create(:user)
      product = create(:product)
      create(:product_review, user: user, product: product)
      expect { user.destroy }.to change(Spree::ProductReview, :count).by(-1)
    end
  end

  context "product_review_for" do
    it "returns the product review for a given product" do
      user = create(:user)
      product = create(:product)
      review = create(:product_review, user: user, product: product)

      expect(user.product_review_for(product)).to eq(review)
    end

    it "returns nil if no review exists for the product" do
      user = create(:user)
      product = create(:product)

      expect(user.product_review_for(product)).to be_nil
    end
  end

  describe "recent_purchase_date_for" do # , :focus do
    let(:store) { @default_store }
    let(:user) { create(:user) }
    let(:product) { create(:product) }

    it "returns nil if no purchase exists for the product" do
      expect(user.recent_purchase_date_for(product)).to be_nil
    end

    context "when there is an order" do
      let(:order) { create(:order, user: user, store: store, completed_at: 3.days.ago) }
      let!(:line_item) { create(:line_item, order: order, product: product, variant: product.master) }

      it "returns the purchase date for a given product" do
        expect(user.recent_purchase_date_for(product)).to eq(order.completed_at)
      end

      it "returns nil if the order isn't complete" do
        order.update(completed_at: nil)
        expect(user.recent_purchase_date_for(product)).to be_nil
      end

      it "returns the most recent purchase date if there is more than one purchase" do
        order2 = create(:order, user: user, completed_at: 1.day.ago)
        create(:line_item, order: order2, product: product, variant: product.master)

        expect(user.recent_purchase_date_for(product)).to eq(order2.completed_at)
      end
    end
  end
end


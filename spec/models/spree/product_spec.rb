require "rails_helper"

RSpec.describe Spree::Product, type: :model do
  describe "product_reviews association" do
    it "has many product_reviews" do
      product = described_class.new
      expect(product).to respond_to(:product_reviews)
    end

    it "destroys associated product_reviews when destroyed" do
      product = create(:product)
      create(:product_review, product: product)
      expect { product.destroy }.to change(Spree::ProductReview, :count).by(-1)
    end
  end
end


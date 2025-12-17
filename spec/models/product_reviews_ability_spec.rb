require "rails_helper"

RSpec.describe Spree::ProductReviewsAbility, type: :model do
  subject { described_class.new(user) }

  let(:user) { create(:user) }
  let(:admin) { create(:admin_user) }
  let(:product_review) { create(:product_review, user: user) }

  context "when the user is an admin" do
    before { allow(user).to receive(:has_spree_role?).with("admin").and_return(true) }

    it "allows managing product reviews" do
      expect(subject.can?(:manage, Spree::ProductReview)).to be true
    end
  end

  context "when the user is a regular user" do
    before do
      allow(user).to receive(:has_spree_role?).with("admin").and_return(false)
      allow(user).to receive(:has_spree_role?).with("user").and_return(true)
    end

    describe "does allow" do
      it "allows creating product reviews" do
        expect(subject.can?(:create, Spree::ProductReview)).to be true
      end

      it "allows updating their own product reviews" do
        expect(subject.can?(:update, product_review)).to be true
      end

      it "allows destroying their own product reviews" do
        expect(subject.can?(:destroy, product_review)).to be true
      end
    end

    describe "does not allow" do
      it "disallows updating others' product reviews" do
        other_user = create(:user)
        other_review = create(:product_review, user: other_user)
        expect(subject.can?(:update, other_review)).to be false
      end

      it "disallows destroying others' product reviews" do
        other_user = create(:user)
        other_review = create(:product_review, user: other_user)
        expect(subject.can?(:destroy, other_review)).to be false
      end

      it "does not allow managing product reviews" do
        expect(subject.can?(:manage, Spree::ProductReview)).to be false
      end
    end
  end

  context "when the user is a guest" do
    before do
      allow(user).to receive(:has_spree_role?).with("admin").and_return(false)
      allow(user).to receive(:has_spree_role?).with("user").and_return(false)
    end

    describe "does allow" do
      it "reading approved product reviews" do
        expect(subject.can?(:read, Spree::ProductReview.new(approved: true))).to be true
      end
    end

    describe "does not allow" do
      it "reading unapproved product reviews" do
        expect(subject.can?(:read, Spree::ProductReview.new(approved: false))).to be false
      end

      it "creating product reviews" do
        expect(subject.can?(:create, Spree::ProductReview)).to be false
      end

      it "updating product reviews" do
        expect(subject.can?(:update, product_review)).to be false
      end

      it "destroying product reviews" do
        expect(subject.can?(:destroy, product_review)).to be false
      end

      it "managing product reviews" do
        expect(subject.can?(:manage, Spree::ProductReview)).to be false
      end
    end
  end
end


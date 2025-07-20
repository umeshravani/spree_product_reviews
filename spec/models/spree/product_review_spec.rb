require "rails_helper"

RSpec.describe Spree::ProductReview, type: :model do
  context "validations" do
    it "is valid with valid attributes" do
      expect(build(:product_review)).to be_valid
    end

    it "is not valid without a product" do
      expect(build(:product_review, product: nil)).not_to be_valid
    end

    it "is not valid without a user" do
      expect(build(:product_review, user: nil)).not_to be_valid
    end

    context "rating" do
      it "is not valid without a rating" do
        expect(build(:product_review, rating: nil)).not_to be_valid
      end

      it "is not valid with a rating less than 1" do
        expect(build(:product_review, rating: 0)).not_to be_valid
      end

      it "is not valid with a rating greater than 5" do
        expect(build(:product_review, rating: 6)).not_to be_valid
      end

      it "does not validate when the rating is not a number" do
        expect(build(:product_review, rating: "five")).not_to be_valid
      end

      it "does not validate when the rating is a float" do
        expect(build(:product_review, rating: 4.5)).not_to be_valid
      end

      (1..5).each do |valid_rating|
        it "is valid with a rating of #{valid_rating}" do
          expect(build(:product_review, rating: valid_rating)).to be_valid
        end
      end
    end

    it "is not valid without a title" do
      expect(build(:product_review, title: nil)).not_to be_valid
    end

    it "is not valid without a review" do
      expect(build(:product_review, review: nil)).not_to be_valid
    end
  end

  context "scopes" do
    describe ".approved" do
      it "returns only approved reviews" do
        approved_review = create(:product_review, approved: true)
        pending_review = create(:product_review, approved: false)

        expect(described_class.approved).to include(approved_review)
        expect(described_class.approved).not_to include(pending_review)
      end
    end

    describe ".pending" do
      it "returns only pending reviews" do
        approved_review = create(:product_review, approved: true)
        pending_review = create(:product_review, approved: false)

        expect(described_class.pending).to include(pending_review)
        expect(described_class.pending).not_to include(approved_review)
      end
    end
  end

  context "instance methods" do
    let(:product_review) { create(:product_review) }

    describe "#pending?" do
      it "returns true if the review is pending" do
        product_review.approved = false
        expect(product_review.pending?).to be true
      end

      it "returns false if the review is approved" do
        product_review.approved = true
        expect(product_review.pending?).to be false
      end
    end

    describe "#approve!" do
      it "approves the review" do
        product_review.approve!
        expect(product_review.approved).to be true
      end
    end

    describe "#reject!" do
      it "rejects the review" do
        product_review.reject!
        expect(product_review.approved).to be false
      end
    end

    describe "#reviewer_name" do
      context "when user is present and show_identifier is true" do
        it "returns the user's name" do
          product_review.show_identifier = true
          product_review.user = create(:user, name: "John Doe")
          expect(product_review.reviewer_name).to eq("John Doe")
        end
      end

      context "when user is present and show_identifier is false" do
        it "returns 'Anonymous'" do
          product_review.show_identifier = false
          product_review.user = create(:user, name: "John Doe")
          expect(product_review.reviewer_name).to eq("Anonymous")
        end
      end

      context "when user is not present" do
        it "returns 'Anonymous'" do
          product_review.user = nil
          expect(product_review.reviewer_name).to eq("Anonymous")
        end
      end
    end

    describe "#review_date" do
      it "returns the formatted created_at date" do
        product_review.created_at = Time.zone.local(2023, 10, 1, 12, 0, 0)
        expect(product_review.review_date).to eq("October 01, 2023 at 12:00PM")
      end
    end
  end
end


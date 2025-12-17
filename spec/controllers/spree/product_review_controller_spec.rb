require "faker"
require "rails_helper"

RSpec.describe Spree::ProductReviewsController, type: :controller do
  stub_authorization!

  render_views

  let(:user) { create(:user) }
  let(:product) { create(:product) }
  let(:product_review) { build(:product_review, product: product, user: user) }

  before do
    allow(controller).to receive_messages(spree_current_user: user, authenticate_user!: true)
    # allow(controller).to receive(:current_ability).and_call_original
  end

  describe "GET #new" do
    it "assigns a new product review" do
      get :new, params: { product_id: product.slug }
      expect(assigns(:product_review)).to be_a_new(Spree::ProductReview)
    end

    it "renders the new template" do
      get :new, params: { product_id: product.slug }
      expect(response).to render_template("new")
    end

    it "fails if the user is not authorized to create a new product review" do
      allow(controller).to receive(:authorize!) { raise }

      expect do
        get :new, params: { product_id: product.slug }
      end.to raise_error
    end
  end

  describe "POST #create" do
    context "with valid attributes" do
      it "creates a new product review" do
        expect {
          post :create, params: {
            product_id: product.slug,
            product_review: product_review.attributes,
          }
        }.to change(Spree::ProductReview, :count).by(1)
      end

      it "redirects to the product page with a success message" do
        post :create, params: {
          product_id: product.slug,
          product_review: product_review.attributes,
        }

        expect(response).to redirect_to(spree.product_path(product))
        expect(flash[:success]).to eq(Spree.t("spree.product_review.flash_messages.create.success"))
      end

      it "fails if the user is not authorized to create a new product review" do
        allow(controller).to receive(:authorize!) { raise }

        expect do
          post :create, params: {
            product_id: product.slug,
            product_review: product_review.attributes,
          }
        end.to raise_error
      end
    end

    context "with invalid attributes" do
      before do
        allow_any_instance_of(Spree::ProductReview).to receive(:save).and_return(false)
      end

      it "does not create a new product review" do
        expect {
          post :create, params: {
            product_id: product.slug,
            product_review: product_review.attributes,
          }
        }.not_to change(Spree::ProductReview, :count)
      end

      it "renders the new template with an error message" do
        post :create, params: {
          product_id: product.slug,
          product_review: product_review.attributes,
        }
        expect(response).to render_template("new")
        expect(flash.now[:error]).to eq(Spree.t("spree.product_review.flash_messages.create.error"))
      end
    end
  end

  describe "GET #index" do
    it "assigns the approved product reviews" do
      approved_review = create(:product_review, product: product, user: user, approved: true)
      create(:product_review, product: product, user: user, approved: false)

      get :index, params: { product_id: product.slug }
      expect(assigns(:product_reviews)).to eq([approved_review])
    end

    it "renders the index template" do
      get :index, params: { product_id: product.slug }
      expect(response).to render_template("index")
    end
  end

  describe "private methods" do
    describe "#load_product" do
      %i[index new].each do |action|
        it "loads the product for action #{action}" do
          get action, params: { product_id: product.slug }
          expect(assigns(:product)).to eq(product)
        end
      end

      it "loads the product for action create" do
        get :create, params: {
          product_id: product.slug,
          product_review: product_review.attributes,
        }
        expect(assigns(:product)).to eq(product)
      end

      it "raises an error if the product is not found" do
        expect {
          get :new, params: { product_id: 9999 }
        }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end
  end
end


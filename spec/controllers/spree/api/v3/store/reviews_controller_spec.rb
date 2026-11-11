require 'spec_helper'
require 'spree/api/testing_support/v3/base'

RSpec.describe Spree::Api::V3::Store::ReviewsController, type: :controller do
  render_views
  routes { Spree::Core::Engine.routes }

  include_context 'API v3 Store'

  let(:product) { create(:product, store: store) }

  before do
    request.headers['X-Spree-Api-Key'] = api_key.token
  end

  describe 'GET #index' do
    let(:fit_question) { create(:review_question, store: store, key: 'overall_fit') }
    let(:true_to_size) { create(:review_question_option, question: fit_question, value: 'true_to_size', label: 'True to size') }
    let(:runs_small) { create(:review_question_option, question: fit_question, value: 'runs_small', label: 'Runs small') }
    let!(:matching_review) { create(:review, :approved, product: product, store: store, rating: 5) }
    let!(:other_review) { create(:review, :approved, product: product, store: store, rating: 3) }

    before do
      create(:review_answer, review: matching_review, question: fit_question, option: true_to_size)
      create(:review_answer, review: other_review, question: fit_question, option: runs_small)
      create(:review, product: product, store: store, rating: 1)
    end

    it 'returns approved reviews for the product' do
      get :index, params: { product_id: product.prefixed_id }

      expect(response).to have_http_status(:ok)
      expect(json_response['data'].map { |review| review['id'] }).to contain_exactly(
        matching_review.prefixed_id,
        other_review.prefixed_id
      )
      expect(json_response['meta']['count']).to eq(2)
    end

    it 'returns multiple reviews from the same customer across separate orders' do
      reviewer = create(:user)
      variant = create(:reviewable_variant, product: product)
      first_order = create(:shipped_order, customer: reviewer, store: store, variants: [variant])
      second_order = create(:shipped_order, customer: reviewer, store: store, variants: [variant])


      first_review = create(
        :review,
        :approved,
        :for_variant,
        product: product,
        variant: variant,
        order: first_order,
        store: store,
        customer: reviewer
      )
      second_review = create(
        :review,
        :approved,
        :for_variant,
        product: product,
        variant: variant,
        order: second_order,
        store: store,
        customer: reviewer
      )

      get :index, params: { product_id: product.prefixed_id }

      expect(response).to have_http_status(:ok)
      expect(json_response['data'].map { |review| review['id'] }).to include(
        first_review.prefixed_id,
        second_review.prefixed_id
      )
    end

    it 'returns purchased option values for variant reviews' do
      color_type = create(:option_type, :color, position: 1)
      size_type = create(:option_type, :size, position: 2)
      white = create(
        :option_value,
        option_type: color_type,
        name: 'white',
        label: 'White',
        position: 1
      )
      size = create(
        :option_value,
        option_type: size_type,
        name: 'size_7_5',
        label: '7.5',
        position: 1
      )
      variant = create(
        :reviewable_variant,
        product: product,
        option_values: [size, white]
      )
      review = create(
        :review,
        :approved,
        product: product,
        variant: variant,
        store: store
      )

      get :index, params: { product_id: product.prefixed_id }

      payload = json_response['data'].find do |item|
        item['id'] == review.prefixed_id
      end
      expect(response).to have_http_status(:ok)
      expect(payload['purchased_option_values']).to eq(['White', '7.5'])
    end

    it 'filters by rating and configured answer values' do
      get :index, params: {
        product_id: product.prefixed_id,
        rating: 5,
        answers: { overall_fit: 'true_to_size' }
      }

      expect(response).to have_http_status(:ok)
      expect(json_response['data'].map { |review| review['id'] }).to eq([matching_review.prefixed_id])
    end
  end

  describe 'POST #create' do
    let(:fit_question) { create(:review_question, store: store, key: 'overall_fit', required: true) }
    let(:true_to_size) { create(:review_question_option, question: fit_question, value: 'true_to_size', label: 'True to size') }
    let(:review_variant) { create(:reviewable_variant, product: product) }
    let(:blob) do
      ActiveStorage::Blob.create_and_upload!(
        io: StringIO.new('review image'),
        filename: 'review.jpg',
        content_type: 'image/jpeg'
      )
    end

    before do
      request.headers['Authorization'] = "Bearer #{jwt_token}"
    end

    let!(:review_order) do
      create(:shipped_order, customer: user, store: store, variants: [review_variant])
    end

    it 'creates a pending review with answers and images' do
      true_to_size

      expect {
        post :create, params: {
          product_id: product.prefixed_id,
          variant_id: review_variant.prefixed_id,
          order_id: review_order.prefixed_id,
          rating: 5,
          title: 'Fabulous dress',
          body: 'The fabric is excellent and the fit is right.',
          reviewer_name: 'Julie M.',
          answers: { overall_fit: 'true_to_size' },
          images: [{ signed_id: blob.signed_id, alt: 'Fit photo' }]
        }
      }.to change(Spree::Review, :count).by(1)

      review = Spree::Review.last
      expect(response).to have_http_status(:created)
      expect(review.status).to eq('pending')
      expect(review.customer).to eq(user)
      expect(review.variant).to eq(review_variant)
      expect(review.order).to eq(review_order)
      expect(review.verified_purchase).to be(true)
      expect(review.title).to eq('Fabulous dress')
      expect(review.answers.first.option).to eq(true_to_size)
      expect(review.review_media.first.attachment).to be_attached
      expect(json_response['media'].first['alt']).to eq('Fit photo')
      expect(json_response).not_to have_key('customer_id')
      expect(json_response).not_to have_key('user_id')
      expect(json_response).not_to have_key('order_id')
      expect(json_response).not_to have_key('reviewer_name')
    end

    it 'stores a profile reviewer name while returning a privacy-formatted public display name' do
      user.update!(first_name: 'Jacqueline', last_name: 'Brown')

      post :create, params: {
        product_id: product.prefixed_id,
        variant_id: review_variant.prefixed_id,
        order_id: review_order.prefixed_id,
        rating: 5,
        title: 'Excellent fit',
        body: 'The fabric is excellent and the fit is right.',
        reviewer_name: 'Leaked Full Name'
      }

      expect(response).to have_http_status(:created)
      expect(Spree::Review.last.reviewer_name).to eq('Jacqueline Brown')
      expect(json_response['reviewer_display_name']).to eq('Jacqueline B.')
    end

    it 'creates a review with a title and no optional content' do
      expect {
        post :create, params: {
          product_id: product.prefixed_id,
          variant_id: review_variant.prefixed_id,
          order_id: review_order.prefixed_id,
          rating: 4,
          title: 'Worked well'
        }
      }.to change(Spree::Review, :count).by(1)

      review = Spree::Review.last
      expect(response).to have_http_status(:created)
      expect(review.title).to eq('Worked well')
      expect(review.body).to eq('')
      expect(review.answers).to be_empty
      expect(json_response['title']).to eq('Worked well')
      expect(json_response['body']).to eq('')
    end

    it 'attributes an omitted variant when the purchase is unambiguous' do
      post :create, params: {
        product_id: product.prefixed_id, order_id: review_order.prefixed_id, rating: 5, title: 'Great fit'
      }

      expect(response).to have_http_status(:created)
      expect(Spree::Review.last.variant).to eq(review_variant)
    end

    it 'requires a variant when the purchase contains several reviewable variants' do
      other_variant = create(:reviewable_variant, product: product)
      order = create(:shipped_order, customer: user, store: store, variants: [review_variant, other_variant])

      expect {
        post :create, params: { product_id: product.prefixed_id, order_id: order.prefixed_id, rating: 5, title: 'Great fit' }
      }.not_to change(Spree::Review, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json_response['error']['details']['variant']).to be_present
    end

    it 'rejects a duplicate when the unambiguous purchased variant was omitted' do
      existing = create(:review, product: product, store: store, customer: user, order: review_order, variant: review_variant)

      post :create, params: { product_id: product.prefixed_id, order_id: review_order.prefixed_id, rating: 5, title: 'Again' }

      expect(response).to have_http_status(:unprocessable_content)
      expect(json_response['error']['code']).to eq('review_already_exists')
      expect(json_response['error']['details']['review_id']).to eq(existing.prefixed_id)
    end

    it 'requires a title' do
      expect {
        post :create, params: {
          product_id: product.prefixed_id,
          variant_id: review_variant.prefixed_id,
          order_id: review_order.prefixed_id,
          rating: 4
        }
      }.not_to change(Spree::Review, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json_response['error']['code']).to eq('validation_error')
      expect(json_response['error']['details']['title']).to be_present
    end

    it 'limits title length' do
      expect {
        post :create, params: {
          product_id: product.prefixed_id,
          variant_id: review_variant.prefixed_id,
          order_id: review_order.prefixed_id,
          rating: 4,
          title: 'A' * (Spree::Review::TITLE_MAX_LENGTH + 1)
        }
      }.not_to change(Spree::Review, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json_response['error']['code']).to eq('validation_error')
      expect(json_response['error']['details']['title']).to be_present
    end

    it 'allows the same customer to review a different purchased variant of the same product' do
      other_variant = create(:reviewable_variant, product: product)
      other_order = create(:shipped_order, customer: user, store: store, variants: [other_variant])

      create(:review, :for_variant, product: product, variant: review_variant, order: review_order, store: store, customer: user)

      expect {
        post :create, params: {
          product_id: product.prefixed_id,
          variant_id: other_variant.prefixed_id,
          order_id: other_order.prefixed_id,
          rating: 4,
          title: 'This size also worked',
          body: 'This size also worked.'
        }
      }.to change(Spree::Review, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(Spree::Review.last.variant).to eq(other_variant)
      expect(Spree::Review.last.order).to eq(other_order)
    end

    it 'allows the same customer to review the same variant from a different shipped order' do
      later_order = create(:shipped_order, customer: user, store: store, variants: [review_variant])

      create(:review, :for_variant, product: product, variant: review_variant, order: review_order, store: store, customer: user)

      expect {
        post :create, params: {
          product_id: product.prefixed_id,
          variant_id: review_variant.prefixed_id,
          order_id: later_order.prefixed_id,
          rating: 4,
          title: 'Still a good fit',
          body: 'Still a good fit on the reorder.'
        }
      }.to change(Spree::Review, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(Spree::Review.last.order).to eq(later_order)
    end

    it 'requires configured required review questions' do
      fit_question

      post :create, params: {
        product_id: product.prefixed_id,
        order_id: review_order.prefixed_id,
        title: 'Great fit',
        rating: 5
      }

      expect(response).to have_http_status(:unprocessable_content)
      expect(json_response['error']['code']).to eq('validation_error')
      expect(json_response['error']['details']['answers']).to be_present
    end

    it 'does not require optional review questions' do
      create(:review_question, store: store, key: 'body_type', required: false)

      post :create, params: {
        product_id: product.prefixed_id,
        order_id: review_order.prefixed_id,
        title: 'Great fit',
        rating: 5
      }

      expect(response).to have_http_status(:created)
      expect(Spree::Review.last.answers).to be_empty
    end

    it 'requires authentication' do
      request.headers['Authorization'] = nil

      expect {
        post :create, params: {
          product_id: product.prefixed_id,
          rating: 5
        }
      }.not_to change(Spree::Review, :count)

      expect(response).to have_http_status(:unauthorized)
      expect(json_response['error']['code']).to eq('authentication_required')
    end

    it 'rejects customers without a shipped purchase for the product' do
      other_product = create(:product, store: store)

      expect {
        post :create, params: {
          product_id: other_product.prefixed_id,
          rating: 5
        }
      }.not_to change(Spree::Review, :count)

      expect(response).to have_http_status(:forbidden)
      expect(json_response['error']['code']).to eq('review_not_allowed')
      expect(json_response['error']['details']['reason']).to eq('not_purchased')
    end

    it 'rejects customers whose purchased variant was fully returned' do
      create_received_return_item(order: review_order, variant: review_variant)

      expect {
        post :create, params: {
          product_id: product.prefixed_id,
          variant_id: review_variant.prefixed_id,
          order_id: review_order.prefixed_id,
          rating: 5,
          title: 'Returned item'
        }
      }.not_to change(Spree::Review, :count)

      expect(response).to have_http_status(:forbidden)
      expect(json_response['error']['code']).to eq('review_not_allowed')
      expect(json_response['error']['details']['reason']).to eq('not_purchased')
      expect(json_response['error']['details']['verified_purchase']).to be(false)
    end

    it 'rejects duplicate customer reviews for the same order product variant' do
      existing_review = create(:review, product: product, order: review_order, store: store, customer: user)

      expect {
        post :create, params: {
          product_id: product.prefixed_id,
          order_id: review_order.prefixed_id,
          rating: 4
        }
      }.not_to change(Spree::Review, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json_response['error']['code']).to eq('review_already_exists')
      expect(json_response['error']['details']['reason']).to eq('already_reviewed')
      expect(json_response['error']['details']['order_id']).to eq(review_order.prefixed_id)
      expect(json_response['error']['details']['review_id']).to eq(existing_review.prefixed_id)
    end
  end
end

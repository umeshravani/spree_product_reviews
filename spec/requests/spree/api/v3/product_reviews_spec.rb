# frozen_string_literal: true

require 'rails_helper'
require 'spree/api/testing_support/v3/base'

RSpec.describe 'Spree 6 Product Reviews API Integration', type: :request do
  let(:store) { Spree::Store.default || create(:store, default: true) }
  let(:admin_api_key) { create(:api_key, :secret, store: store) }
  let(:admin_user) { create(:admin_user) }
  let(:admin_jwt_token) do
    Spree::Api::V3::TestingSupport.generate_jwt(
      admin_user,
      audience: Spree::Api::V3::JwtAuthentication::JWT_AUDIENCE_ADMIN
    )
  end
  let(:admin_headers) do
    {
      'X-Spree-Api-Key' => admin_api_key.plaintext_token,
      'Authorization' => "Bearer #{admin_jwt_token}",
      'Accept' => 'application/json'
    }
  end

  let(:store_api_key) { create(:api_key, :publishable, store: store) }
  let(:store_headers) do
    {
      'X-Spree-Api-Key' => store_api_key.token,
      'Accept' => 'application/json'
    }
  end

  let!(:product) { create(:product, store: store) }
  let!(:empty_product) { create(:product, store: store) }

  let!(:approved_review_5) do
    create(
      :product_review,
      :approved,
      product: product,
      rating: 5,
      title: 'Amazing piece',
      review: 'Looks incredible on the gallery wall!'
    )
  end

  let!(:approved_review_3) do
    create(
      :product_review,
      :approved,
      product: product,
      rating: 3,
      title: 'Average piece',
      review: 'Color is slightly dimmer than pictured.'
    )
  end

  let!(:pending_review) do
    create(
      :product_review,
      product: product,
      rating: 4,
      title: 'Pending moderation',
      review: 'Just submitted, waiting for admin approval.'
    )
  end

  describe 'Review summary (GET /api/v3/admin/products/:product_id/reviews_summary)' do
    context 'with Spree 6 prefixed product identifier (e.g., prod_...)' do
      it 'resolves the product and returns 200 OK with correct summary breakdown' do
        get "/api/v3/admin/products/#{product.prefixed_id}/reviews_summary", headers: admin_headers

        expect(response).to have_http_status(:ok)
        data = json_response['data']
        expect(data['product_id']).to eq(product.id.to_s)
        expect(data['product_name']).to eq(product.name)
        expect(data['pending_count']).to eq(1)
        expect(data['approved_count']).to eq(2)
        expect(data['rejected_count']).to eq(0)
        expect(data['spam_count']).to eq(0)
        expect(data['recent_reviews']).to be_an(Array)
        expect(data['recent_reviews'].size).to be >= 1
      end
    end

    context 'with product slug' do
      it 'resolves the product and returns 200 OK' do
        get "/api/v3/admin/products/#{product.slug}/reviews_summary", headers: admin_headers

        expect(response).to have_http_status(:ok)
        expect(json_response['data']['product_id']).to eq(product.id.to_s)
      end
    end

    context 'with numeric product ID' do
      it 'resolves the product and returns 200 OK' do
        get "/api/v3/admin/products/#{product.id}/reviews_summary", headers: admin_headers

        expect(response).to have_http_status(:ok)
        expect(json_response['data']['product_id']).to eq(product.id.to_s)
      end
    end

    context 'with products without reviews' do
      it 'returns 200 OK with zero counts and empty recent reviews without crashing' do
        get "/api/v3/admin/products/#{empty_product.prefixed_id}/reviews_summary", headers: admin_headers

        expect(response).to have_http_status(:ok)
        data = json_response['data']
        expect(data['product_id']).to eq(empty_product.id.to_s)
        expect(data['review_count']).to eq(0)
        expect(data['average_rating']).to eq(0.0)
        expect(data['pending_count']).to eq(0)
        expect(data['approved_count']).to eq(0)
        expect(data['recent_reviews']).to eq([])
      end
    end

    context 'with non-existent product identifier' do
      it 'returns 404 Not Found without swallowing real API errors' do
        get '/api/v3/admin/products/prod_nonexistent999/reviews_summary', headers: admin_headers

        expect(response).to have_http_status(:not_found)
        expect(json_response['error']).to eq('product_not_found')
        expect(json_response['message']).to eq('Product not found.')
      end
    end
  end

  describe 'Review listing' do
    describe 'Store API (GET /api/v3/store/products/:product_id/product_reviews)' do
      it 'returns only approved reviews for public store shoppers' do
        get "/api/v3/store/products/#{product.prefixed_id}/product_reviews", headers: store_headers

        expect(response).to have_http_status(:ok)
        data = json_response['data']
        # 2 approved reviews, pending review excluded
        expect(data.size).to eq(2)
        titles = data.map { |r| r['title'] }
        expect(titles).to include('Amazing piece', 'Average piece')
        expect(titles).not_to include('Pending moderation')

        # Meta includes breakdown
        meta = json_response['meta']
        expect(meta['total_count']).to eq(2)
        expect(meta['rating_distribution']).to be_present
      end

      it 'filters approved reviews by rating' do
        get "/api/v3/store/products/#{product.prefixed_id}/product_reviews",
            params: { rating: 5 },
            headers: store_headers

        expect(response).to have_http_status(:ok)
        data = json_response['data']
        expect(data.size).to eq(1)
        expect(data.first['rating']).to eq(5)
      end
    end

    describe 'Admin API (GET /api/v3/admin/product_reviews)' do
      it 'filters by prefixed product ID without casting failures' do
        get '/api/v3/admin/product_reviews',
            params: { product_id: product.prefixed_id, status: 'all' },
            headers: admin_headers

        expect(response).to have_http_status(:ok)
        data = json_response['data']
        # Product has 3 reviews total (2 approved, 1 pending)
        expect(data.size).to eq(3)
        product_ids = data.map { |r| r['product_id'] }
        expect(product_ids.uniq).to eq([product.id.to_s])
      end
    end
  end

  describe 'Review submission (POST /api/v3/store/products/:product_id/product_reviews)' do
    let(:customer) { create(:customer) }
    let(:jwt_token) { Spree::Api::V3::TestingSupport.generate_jwt(customer) }
    let(:auth_headers) do
      store_headers.merge('Authorization' => "Bearer #{jwt_token}")
    end

    it 'creates a review and returns 201 Created' do
      expect do
        post "/api/v3/store/products/#{product.prefixed_id}/product_reviews",
             params: {
               product_review: {
                 rating: 5,
                 title: 'Loved it',
                 review: 'Excellent print quality and fast delivery.',
                 name: 'Customer S.'
               }
             },
             headers: auth_headers
      end.to change(Spree::ProductReview, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json_response['data']['title']).to eq('Loved it')
      expect(json_response['data']['rating']).to eq(5)
    end

    it 'returns 422 Unprocessable Entity when validation fails' do
      post "/api/v3/store/products/#{product.prefixed_id}/product_reviews",
           params: {
             product_review: {
               rating: 10, # Invalid rating > 5
               title: '',
               review: ''
             }
           },
           headers: auth_headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response['error']).to eq('validation_failed')
      expect(json_response['errors']).to be_an(Array)
    end
  end

  describe 'Review moderation' do
    let(:review) { pending_review }

    it 'approves a review via POST /api/v3/admin/product_reviews/:id/approve' do
      post "/api/v3/admin/product_reviews/#{review.id}/approve",
           params: { note: 'Looks legitimate' },
           headers: admin_headers

      expect(response).to have_http_status(:ok)
      expect(review.reload.approved).to be true
      expect(review.rejected).to be false
      expect(review.spam).to be false
    end

    it 'rejects a review via POST /api/v3/admin/product_reviews/:id/reject' do
      post "/api/v3/admin/product_reviews/#{review.id}/reject",
           params: { note: 'Contains profanity' },
           headers: admin_headers

      expect(response).to have_http_status(:ok)
      expect(review.reload.approved).to be false
      expect(review.rejected).to be true
    end

    it 'marks a review as spam via POST /api/v3/admin/product_reviews/:id/mark_spam' do
      post "/api/v3/admin/product_reviews/#{review.id}/mark_spam",
           params: { note: 'Promotional bot link' },
           headers: admin_headers

      expect(response).to have_http_status(:ok)
      expect(review.reload.spam).to be true
      expect(review.approved).to be false
    end
  end
end

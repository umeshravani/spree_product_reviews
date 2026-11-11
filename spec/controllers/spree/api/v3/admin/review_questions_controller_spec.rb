require 'spec_helper'

RSpec.describe Spree::Api::V3::Admin::ReviewQuestionsController, type: :controller do
  render_views
  routes { Spree::Core::Engine.routes }

  include_context 'API v3 Admin authenticated'

  let(:product) { create(:product, store: store) }

  before { request.headers.merge!(headers) }

  describe 'GET #index' do
    let!(:store_question) { create(:review_question, store: store, position: 2) }
    let!(:first_question) { create(:review_question, store: store, position: 1) }

    it 'returns questions for the current store in configured order' do
      create(:review_question, store: create(:store))

      get :index, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response['data'].map { |item| item['id'] }).to eq(
        [first_question.prefixed_id, store_question.prefixed_id]
      )
    end
  end

  describe 'POST #create' do
    it 'creates a product-scoped question with options' do
      expect {
        post :create,
             params: {
               key: 'overall_fit',
               label: 'Overall fit',
               kind: 'single_select',
               applies_to: 'product',
               product_id: product.prefixed_id,
               filterable: true,
               required: true,
               active: true,
               position: 3,
               options: [
                 { value: 'true_to_size', label: 'True to size', position: 1 },
                 { value: 'runs_small', label: 'Runs small', position: 2 }
               ]
             },
             as: :json
      }.to change(Spree::ReviewQuestion, :count).by(1)
       .and change(Spree::ReviewQuestionOption, :count).by(2)

      question = Spree::ReviewQuestion.find_by_prefix_id(json_response['id'])
      expect(response).to have_http_status(:created)
      expect(question.store).to eq(store)
      expect(question.product).to eq(product)
      expect(json_response['product_id']).to eq(product.prefixed_id)
      expect(json_response['options'].map { |option| option['value'] }).to contain_exactly('true_to_size', 'runs_small')
    end

    it 'rejects a category from another store' do
      other_store = create(:store)
      other_category = create(:category, store: other_store)

      post :create,
           params: {
             key: 'body_type',
             label: 'Body type',
             kind: 'single_select',
             applies_to: 'category',
             category_id: other_category.prefixed_id
           },
           as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json_response['error']['code']).to eq('validation_error')
      expect(json_response['error']['details']).to include('category')
    end
  end

  describe 'PATCH #update' do
    let!(:question) { create(:review_question, store: store, key: 'body_type') }
    let!(:option) { create(:review_question_option, question: question, value: 'curvy_on_top', label: 'Curvy on top') }

    it 'updates question fields and nested options with prefixed IDs' do
      patch :update,
            params: {
              id: question.prefixed_id,
              label: 'Body type',
              required: true,
              options: [
                { id: option.prefixed_id, value: 'curvy_on_top', label: 'Curvy on top updated', position: 2 },
                { value: 'straight', label: 'Straight', position: 1 }
              ]
            },
            as: :json

      expect(response).to have_http_status(:ok)
      expect(question.reload).to have_attributes(label: 'Body type', required: true)
      expect(option.reload).to have_attributes(label: 'Curvy on top updated', position: 2)
      expect(question.options.map(&:value)).to contain_exactly('curvy_on_top', 'straight')
    end
  end

  describe 'DELETE #destroy' do
    let!(:question) { create(:review_question, store: store) }

    it 'deletes a question and its options' do
      create(:review_question_option, question: question)

      expect {
        delete :destroy, params: { id: question.prefixed_id }, as: :json
      }.to change(Spree::ReviewQuestion, :count).by(-1)
       .and change(Spree::ReviewQuestionOption, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end

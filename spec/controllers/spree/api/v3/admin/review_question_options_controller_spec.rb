require 'spec_helper'

RSpec.describe Spree::Api::V3::Admin::ReviewQuestionOptionsController, type: :controller do
  render_views
  routes { Spree::Core::Engine.routes }

  include_context 'API v3 Admin authenticated'

  let(:question) { create(:review_question, store: store) }
  let!(:option) { create(:review_question_option, question: question, value: 'true_to_size', label: 'True to size') }

  before { request.headers.merge!(headers) }

  describe 'GET #index' do
    it 'returns options for the question' do
      other_question = create(:review_question, store: store)
      create(:review_question_option, question: other_question)

      get :index, params: { review_question_id: question.prefixed_id }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response['data'].map { |item| item['id'] }).to eq([option.prefixed_id])
    end
  end

  describe 'POST #create' do
    it 'creates an option under the question' do
      expect {
        post :create,
             params: {
               review_question_id: question.prefixed_id,
               value: 'runs_large',
               label: 'Runs large',
               position: 2
             },
             as: :json
      }.to change(question.options, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json_response['value']).to eq('runs_large')
    end
  end

  describe 'PATCH #update' do
    it 'updates an option' do
      patch :update,
            params: {
              review_question_id: question.prefixed_id,
              id: option.prefixed_id,
              label: 'True to size updated',
              active: false
            },
            as: :json

      expect(response).to have_http_status(:ok)
      expect(option.reload).to have_attributes(label: 'True to size updated', active: false)
    end
  end

  describe 'DELETE #destroy' do
    it 'deletes an option' do
      expect {
        delete :destroy,
               params: { review_question_id: question.prefixed_id, id: option.prefixed_id },
               as: :json
      }.to change(question.options, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end

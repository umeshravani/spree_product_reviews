require 'spec_helper'
require 'spree/api/testing_support/v3/base'

RSpec.describe Spree::Api::V3::Store::ReviewMediaDirectUploadsController, type: :controller do
  render_views
  routes { Spree::Core::Engine.routes }

  include_context 'API v3 Store'

  before do
    request.headers['X-Spree-Api-Key'] = api_key.token
  end

  describe 'POST #create' do
    let(:image_blob_params) do
      {
        filename: 'review.jpg',
        byte_size: 12,
        checksum: Digest::MD5.base64digest('review image'),
        content_type: 'image/jpeg'
      }
    end

    it 'creates a direct upload for review images' do
      post :create, params: { blob: image_blob_params }

      expect(response).to have_http_status(:created)
      expect(json_response['signed_id']).to be_present
      expect(json_response['direct_upload']['url']).to be_present
    end

    it 'uses the configured public storage service' do
      previous_public_storage_service_name = Spree.class_variable_get(:@@public_storage_service_name)
      Spree.public_storage_service_name = :local

      post :create, params: { blob: image_blob_params }

      blob = ActiveStorage::Blob.find_signed!(json_response['signed_id'])
      expect(blob.service_name).to eq('local')
    ensure
      Spree.public_storage_service_name = previous_public_storage_service_name
    end

    it 'rejects non-image uploads' do
      post :create, params: {
        blob: {
          filename: 'review.txt',
          byte_size: 12,
          checksum: Digest::MD5.base64digest('review image'),
          content_type: 'text/plain'
        }
      }

      expect(response).to have_http_status(:bad_request)
      expect(json_response['error']['code']).to eq('parameter_invalid')
    end
  end
end

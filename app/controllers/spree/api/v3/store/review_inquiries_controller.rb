# frozen_string_literal: true

module Spree
  module Api
    module V3
      module Store
        class ReviewInquiriesController < Store::BaseController
          include Spree::Api::V3::Store::ReviewProductLookup

          # GET /api/v3/store/products/:product_id/questions
          def index
            questions = Spree::ProductQuestion.for_store(current_store)
                                              .for_product(@product)
                                              .visible_to_public
                                              .ordered

            render json: {
              data: questions.map { |q| serialize_question(q) },
              meta: {
                total_count: questions.count
              }
            }, status: :ok
          end

          # POST /api/v3/store/products/:product_id/questions
          # POST /api/v3/store/products/:product_id/reviews/ask_question
          def create
            name = (params[:name].presence || params[:author_name]).to_s.strip
            email = (params[:email].presence || params[:author_email]).to_s.strip
            question_text = (params[:question].presence || params[:message]).to_s.strip

            if name.blank? || email.blank? || question_text.blank?
              return render json: {
                error: 'Name, email, and question are required fields.'
              }, status: :unprocessable_entity
            end

            question = Spree::ProductQuestion.create!(
              store: current_store,
              product: @product,
              author_name: name,
              author_email: email,
              question: question_text,
              status: 'pending'
            )

            Rails.logger.info("[SpreeProductReviews] Customer question created #{question.id} for product #{@product.id} (#{name} <#{email}>): #{question_text.truncate(100)}")

            render json: {
              data: serialize_question(question),
              message: 'Thank you! Your question has been submitted. Our team will review and reply shortly.'
            }, status: :created
          rescue ActiveRecord::RecordInvalid => e
            render json: { error: e.record.errors.full_messages.to_sentence }, status: :unprocessable_entity
          end

          private

          def serialize_question(q)
            {
              id: q.id,
              product_id: q.product_id,
              author_name: q.author_name,
              question: q.question,
              answer: q.answer,
              answered_by: q.answered_by,
              status: q.status,
              created_at: q.created_at,
              answered_at: q.answered_at
            }
          end
        end
      end
    end
  end
end

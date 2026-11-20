# frozen_string_literal: true

module Spree
  module Api
    module V3
      module Admin
        class ProductQuestionsController < BaseController
          scoped_resource :reviews

          before_action :set_question, only: [:show, :update, :destroy]

          # GET /api/v3/admin/product_questions
          def index
            scope = Spree::ProductQuestion.for_store(current_store).includes(:product)

            status = params[:status].to_s.strip
            scope = scope.where(status: status) if status.present? && status != 'all'

            if params[:q].present?
              query = "%#{params[:q].to_s.strip}%"
              scope = scope.where(
                'question ILIKE :q OR author_name ILIKE :q OR author_email ILIKE :q OR answer ILIKE :q',
                q: query
              )
            end

            if params[:product_id].present?
              scope = scope.where(product_id: params[:product_id])
            end

            total_count = scope.count
            page = [params[:page].to_i, 1].max
            per_page = [[params[:per_page].to_i, 25].max, 100].min

            questions = scope.ordered.offset((page - 1) * per_page).limit(per_page)

            pending_count = Spree::ProductQuestion.for_store(current_store).where(status: 'pending').count
            answered_count = Spree::ProductQuestion.for_store(current_store).where(status: %w[answered approved]).count

            render json: {
              data: questions.map { |q| serialize_admin_question(q) },
              meta: {
                total_count: total_count,
                page: page,
                per_page: per_page,
                total_pages: (total_count.to_f / per_page).ceil,
                pending_count: pending_count,
                answered_count: answered_count
              }
            }, status: :ok
          end

          # GET /api/v3/admin/product_questions/:id
          def show
            render json: { data: serialize_admin_question(@question) }, status: :ok
          end

          # PATCH/PUT /api/v3/admin/product_questions/:id
          def update
            attrs = question_params

            if attrs[:answer].present?
              attrs[:answered_at] ||= Time.current
              attrs[:answered_by] ||= (current_spree_user&.email.presence || 'Store Admin')
              attrs[:status] = 'answered' if attrs[:status].blank? || attrs[:status] == 'pending'
            end

            @question.update!(attrs)

            render json: {
              data: serialize_admin_question(@question),
              message: 'Question updated successfully.'
            }, status: :ok
          rescue ActiveRecord::RecordInvalid => e
            render json: { error: e.record.errors.full_messages.to_sentence }, status: :unprocessable_entity
          end

          # DELETE /api/v3/admin/product_questions/:id
          def destroy
            @question.destroy!
            render json: { success: true, message: 'Question deleted.' }, status: :ok
          end

          private

          def set_question
            @question = Spree::ProductQuestion.for_store(current_store).find(params[:id])
          rescue ActiveRecord::RecordNotFound
            render json: { error: 'Customer question not found.' }, status: :not_found
          end

          def question_params
            params.require(:question).permit(
              :answer,
              :answered_by,
              :status
            )
          rescue ActionController::ParameterMissing
            params.permit(:answer, :answered_by, :status)
          end

          def serialize_admin_question(q)
            product = q.product
            image_url = product&.gallery&.images&.first&.url rescue nil

            {
              id: q.id,
              author_name: q.author_name,
              author_email: q.author_email,
              question: q.question,
              answer: q.answer,
              answered_by: q.answered_by,
              status: q.status,
              created_at: q.created_at,
              answered_at: q.answered_at,
              product_id: q.product_id,
              product: product ? {
                id: product.id,
                name: product.name,
                slug: product.slug,
                image_url: image_url
              } : nil
            }
          end
        end
      end
    end
  end
end

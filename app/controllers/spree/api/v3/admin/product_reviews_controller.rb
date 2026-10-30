# frozen_string_literal: true

module Spree
  module Api
    module V3
      module Admin
        class ProductReviewsController < (defined?(::Spree::Api::V3::Admin::BaseController) ? ::Spree::Api::V3::Admin::BaseController : ActionController::API)
          scoped_resource :product_reviews if respond_to?(:scoped_resource)

          before_action :load_review, only: [:show, :update, :destroy, :approve, :reject, :mark_spam, :unmark_spam]

          # GET /api/v3/admin/product_reviews
          def index
            scope = base_scope

            if params[:status].present?
              case params[:status]
              when 'pending'
                scope = scope.pending
              when 'approved'
                scope = scope.approved
              when 'spam'
                scope = scope.spam
              when 'rejected'
                scope = scope.rejected
              end
            end

            scope = scope.where(product_id: params[:product_id]) if params[:product_id].present?
            scope = scope.where(rating: params[:rating].to_i) if params[:rating].present?

            page = [params[:page].to_i, 1].max
            per_page = [[(params[:per_page] || 25).to_i, 1].max, 100].min
            total_count = scope.count
            reviews = scope.order(created_at: :desc).offset((page - 1) * per_page).limit(per_page)

            render json: {
              data: serialize_reviews(reviews),
              meta: {
                total_count: total_count,
                page: page,
                per_page: per_page
              }
            }, status: :ok
          end

          # GET /api/v3/admin/product_reviews/counts
          def counts
            scope = base_scope
            render json: {
              data: {
                pending: scope.pending.count,
                approved: scope.approved.count,
                spam: scope.spam.count,
                total: scope.count
              }
            }, status: :ok
          end

          # GET /api/v3/admin/product_reviews/:id
          def show
            render json: { data: serialize_review(@review) }, status: :ok
          end

          # PATCH /api/v3/admin/product_reviews/:id
          def update
            if @review.update(admin_review_params)
              render json: { data: serialize_review(@review) }, status: :ok
            else
              render json: { error: 'validation_failed', errors: @review.errors.full_messages }, status: :unprocessable_entity
            end
          end

          # POST /api/v3/admin/product_reviews/:id/approve
          def approve
            @review.approve!
            render json: { data: serialize_review(@review), meta: { message: 'Review approved.' } }, status: :ok
          end

          # POST /api/v3/admin/product_reviews/:id/reject
          def reject
            @review.reject!
            render json: { data: serialize_review(@review), meta: { message: 'Review rejected.' } }, status: :ok
          end

          # POST /api/v3/admin/product_reviews/:id/mark_spam
          def mark_spam
            @review.mark_spam!
            render json: { data: serialize_review(@review), meta: { message: 'Review marked as spam.' } }, status: :ok
          end

          # POST /api/v3/admin/product_reviews/:id/unmark_spam
          def unmark_spam
            @review.unmark_spam!
            render json: { data: serialize_review(@review), meta: { message: 'Spam flag cleared.' } }, status: :ok
          end

          # DELETE /api/v3/admin/product_reviews/:id
          def destroy
            @review.destroy
            head :no_content
          end

          private

          def base_scope
            scope = Spree::ProductReview.all
            if respond_to?(:current_store) && current_store
              scope = scope.joins(:product).where(spree_products: { store_id: current_store.id })
            end
            scope
          end

          def read_actions
            (defined?(super) ? super : []) + %w[index show counts]
          end

          def load_review
            @review = base_scope.find(params[:id])
          end

          def admin_review_params
            params.require(:product_review).permit(:title, :review, :rating, :approved, :spam, :name, :show_identifier)
          end

          def serialize_reviews(reviews)
            reviews.map { |r| serialize_review(r) }
          end

          def serialize_review(review)
            {
              id: review.id.to_s,
              product_id: review.product_id.to_s,
              product_name: review.product&.name || review.product_name,
              customer_id: review.customer_id&.to_s,
              user_id: review.user_id&.to_s,
              reviewer_name: review.reviewer_name,
              rating: review.rating,
              title: review.title,
              review: review.review,
              approved: review.approved,
              spam: review.spam,
              verified_purchaser: review.verified_purchaser,
              helpful_count: review.helpful_count,
              unhelpful_count: review.unhelpful_count,
              ip_address: review.ip_address,
              locale: review.locale,
              created_at: review.created_at&.iso8601,
              updated_at: review.updated_at&.iso8601
            }
          end
        end
      end
    end
  end
end

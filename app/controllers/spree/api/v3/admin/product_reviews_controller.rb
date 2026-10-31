# frozen_string_literal: true

module Spree
  module Api
    module V3
      module Admin
        class ProductReviewsController < (defined?(::Spree::Api::V3::Admin::BaseController) ? ::Spree::Api::V3::Admin::BaseController : ActionController::API)
          scoped_resource :product_reviews if respond_to?(:scoped_resource)

          before_action :load_review, only: [
            :show, :update, :destroy, :approve, :reject, :mark_spam, :unmark_spam,
            :restore, :hide, :unhide, :destroy_image
          ]

          # GET /api/v3/admin/product_reviews
          def index
            scope = base_scope

            # Status filtering
            case params[:status]
            when 'pending'
              scope = scope.pending
            when 'approved'
              scope = scope.approved
            when 'rejected'
              scope = scope.rejected
            when 'spam'
              scope = scope.spam
            when 'hidden'
              scope = scope.hidden
            when 'flagged'
              scope = scope.flagged
            when 'discarded'
              scope = scope.discarded
            when 'all'
              # all reviews
            else
              scope = scope.not_discarded
            end

            # Product filter
            scope = scope.where(product_id: params[:product_id]) if params[:product_id].present?

            # Rating filter
            scope = scope.where(rating: params[:rating].to_i) if params[:rating].present?

            # Text search (product name, reviewer name, title, review body)
            if params[:q].present?
              query = "%#{params[:q].to_s.downcase}%"
              scope = scope.left_joins(:product).where(
                'LOWER(spree_product_reviews.title) LIKE :q OR LOWER(spree_product_reviews.review) LIKE :q OR LOWER(spree_product_reviews.name) LIKE :q OR LOWER(spree_products.name) LIKE :q',
                q: query
              )
            end

            # Sorting
            scope = case params[:sort]
                    when 'oldest'
                      scope.order(created_at: :asc)
                    when 'rating_desc'
                      scope.order(rating: :desc, created_at: :desc)
                    when 'rating_asc'
                      scope.order(rating: :asc, created_at: :desc)
                    when 'helpful'
                      scope.order(helpful_count: :desc, created_at: :desc)
                    else
                      scope.order(created_at: :desc)
                    end

            page = [params[:page].to_i, 1].max
            per_page = [[(params[:per_page] || 25).to_i, 1].max, 100].min
            total_count = scope.count
            reviews = scope.offset((page - 1) * per_page).limit(per_page)

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
                rejected: scope.rejected.count,
                spam: scope.spam.count,
                hidden: scope.hidden.count,
                flagged: scope.flagged.count,
                total: scope.not_discarded.count
              }
            }, status: :ok
          end

          # GET /api/v3/admin/products/:product_id/reviews_summary
          def summary
            product = current_store_products.friendly.find(params[:product_id])
            reviews = product.reviews.not_discarded

            render json: {
              data: {
                product_id: product.id.to_s,
                product_name: product.name,
                average_rating: product.average_rating.to_f,
                review_count: product.review_count.to_i,
                pending_count: reviews.pending.count,
                approved_count: reviews.approved.count,
                rejected_count: reviews.rejected.count,
                spam_count: reviews.spam.count,
                recent_reviews: serialize_reviews(reviews.newest.limit(5))
              }
            }, status: :ok
          rescue ActiveRecord::RecordNotFound
            render json: { error: 'product_not_found', message: 'Product not found.' }, status: :not_found
          end

          # GET /api/v3/admin/product_reviews/:id
          def show
            render json: { data: serialize_review_detail(@review) }, status: :ok
          end

          # PATCH /api/v3/admin/product_reviews/:id
          def update
            if @review.update(admin_review_params)
              @review.record_audit!(action: :edit, moderator: current_moderator, note: params[:moderator_note])
              render json: { data: serialize_review_detail(@review) }, status: :ok
            else
              render json: { error: 'validation_failed', errors: @review.errors.full_messages }, status: :unprocessable_entity
            end
          end

          # POST /api/v3/admin/product_reviews/:id/approve
          def approve
            @review.approve!(moderator: current_moderator, note: params[:note])
            render json: { data: serialize_review_detail(@review), meta: { message: 'Review approved.' } }, status: :ok
          end

          # POST /api/v3/admin/product_reviews/:id/reject
          def reject
            @review.reject!(moderator: current_moderator, note: params[:note])
            render json: { data: serialize_review_detail(@review), meta: { message: 'Review rejected.' } }, status: :ok
          end

          # POST /api/v3/admin/product_reviews/:id/mark_spam
          def mark_spam
            @review.mark_spam!(moderator: current_moderator, note: params[:note])
            render json: { data: serialize_review_detail(@review), meta: { message: 'Review marked as spam.' } }, status: :ok
          end

          # POST /api/v3/admin/product_reviews/:id/unmark_spam
          # POST /api/v3/admin/product_reviews/:id/restore
          def unmark_spam
            restore
          end

          def restore
            @review.restore!(moderator: current_moderator, note: params[:note])
            render json: { data: serialize_review_detail(@review), meta: { message: 'Review restored successfully.' } }, status: :ok
          end

          # POST /api/v3/admin/product_reviews/:id/hide
          def hide
            @review.hide!(moderator: current_moderator, note: params[:note])
            render json: { data: serialize_review_detail(@review), meta: { message: 'Review hidden from storefront.' } }, status: :ok
          end

          # POST /api/v3/admin/product_reviews/:id/unhide
          def unhide
            @review.unhide!(moderator: current_moderator, note: params[:note])
            render json: { data: serialize_review_detail(@review), meta: { message: 'Review unhidden.' } }, status: :ok
          end

          # POST /api/v3/admin/product_reviews/:id/dismiss_reports
          def dismiss_reports
            note = params[:note].presence || 'Reports dismissed by administrator'
            if @review.respond_to?(:reports)
              @review.reports.pending.each { |r| r.dismiss!(moderator: current_moderator, note: note) }
            end
            @review.update_columns(flagged_count: 0)
            @review.record_audit!(action: :reports_dismissed, moderator: current_moderator, note: note)
            render json: { data: serialize_review_detail(@review.reload), meta: { message: 'Reports dismissed successfully.' } }, status: :ok
          end

          # DELETE /api/v3/admin/product_reviews/:id/images/:image_id
          def destroy_image
            if @review.remove_image!(params[:image_id], moderator: current_moderator, note: params[:note])
              render json: { data: serialize_review_detail(@review), meta: { message: 'Image removed successfully.' } }, status: :ok
            else
              render json: { error: 'image_not_found', message: 'Image attachment not found.' }, status: :not_found
            end
          end

          # POST /api/v3/admin/product_reviews/bulk_moderate
          def bulk_moderate
            review_ids = Array(params[:ids])
            action = params[:action_type].to_s
            note = params[:note]

            if review_ids.empty?
              return render json: { error: 'empty_selection', message: 'No review IDs specified.' }, status: :unprocessable_entity
            end

            reviews = base_scope.where(id: review_ids)
            processed_count = 0

            reviews.find_each do |review|
              case action
              when 'approve'
                review.approve!(moderator: current_moderator, note: note)
                processed_count += 1
              when 'reject'
                review.reject!(moderator: current_moderator, note: note)
                processed_count += 1
              when 'mark_spam'
                review.mark_spam!(moderator: current_moderator, note: note)
                processed_count += 1
              when 'hide'
                review.hide!(moderator: current_moderator, note: note)
                processed_count += 1
              when 'restore'
                review.restore!(moderator: current_moderator, note: note)
                processed_count += 1
              end
            end

            render json: {
              data: {
                processed_count: processed_count,
                total_requested: review_ids.size
              },
              meta: { message: "Successfully executed #{action} on #{processed_count} review(s)." }
            }, status: :ok
          end

          # DELETE /api/v3/admin/product_reviews/:id
          def destroy
            if params[:force] == 'true' || params[:force] == true
              @review.destroy
            else
              @review.discard!(moderator: current_moderator, note: params[:note])
            end
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

          def current_store_products
            if respond_to?(:current_store) && current_store
              current_store.products
            else
              Spree::Product
            end
          end

          def read_actions
            (defined?(super) ? super : []) + %w[index show counts summary]
          end

          def load_review
            @review = base_scope.find(params[:id])
          end

          def current_moderator
            if respond_to?(:spree_current_user) && spree_current_user
              spree_current_user
            elsif respond_to?(:spree_current_admin_user) && spree_current_admin_user
              spree_current_admin_user
            elsif respond_to?(:current_api_key) && current_api_key
              current_api_key.name
            else
              'Admin'
            end
          end

          def admin_review_params
            params.require(:product_review).permit(
              :title, :review, :rating, :approved, :spam, :name, :show_identifier,
              :hidden, :rejected
            )
          end

          def serialize_reviews(reviews)
            reviews.map { |r| serialize_review_summary(r) }
          end

          def serialize_review_summary(review)
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
              status: review.status,
              approved: review.approved,
              spam: review.spam,
              hidden: review.hidden,
              rejected: review.rejected,
              verified_purchaser: review.verified_purchaser,
              helpful_count: review.helpful_count,
              unhelpful_count: review.unhelpful_count,
              images_count: review.images.attached? ? review.images.count : 0,
              created_at: review.created_at&.iso8601,
              updated_at: review.updated_at&.iso8601
            }
          end

          def serialize_review_detail(review)
            data = serialize_review_summary(review)

            # Images gallery
            images_data = []
            if review.images.attached?
              review.images.each do |img|
                images_data << {
                  id: img.id.to_s,
                  filename: img.filename.to_s,
                  byte_size: img.byte_size,
                  content_type: img.content_type,
                  url: Rails.application.routes.url_helpers.rails_blob_path(img, only_path: true)
                }
              rescue StandardError
                images_data << {
                  id: img.id.to_s,
                  filename: img.filename.to_s,
                  byte_size: img.byte_size
                }
              end
            end

            # Customer info
            customer_data = nil
            if review.customer.present?
              c = review.customer
              customer_data = {
                id: c.id.to_s,
                email: c.respond_to?(:email) ? c.email : nil,
                name: c.respond_to?(:name) ? c.name : [c.try(:first_name), c.try(:last_name)].compact.join(' ')
              }
            end

            # Product info
            product_data = nil
            if review.product.present?
              p = review.product
              product_data = {
                id: p.id.to_s,
                name: p.name,
                slug: p.slug
              }
            end

            # Moderation audit history
            audits_data = []
            if review.respond_to?(:moderation_audits)
              review.moderation_audits.chronological.limit(20).each do |audit|
                audits_data << {
                  id: audit.id.to_s,
                  action: audit.action,
                  moderator_name: audit.moderator_name,
                  note: audit.note,
                  metadata: audit.metadata,
                  created_at: audit.created_at&.iso8601
                }
              end
            end

            # Customer reports
            reports_data = []
            if review.respond_to?(:reports)
              review.reports.newest.limit(10).each do |rep|
                reports_data << {
                  id: rep.id.to_s,
                  reason: rep.reason,
                  details: rep.details,
                  status: rep.status,
                  created_at: rep.created_at&.iso8601
                }
              end
            end

            data.merge(
              ip_address: review.ip_address,
              flagged_count: review.flagged_count || 0,
              spam_score: review.spam_score || 0,
              locale: review.locale,
              moderated_at: review.moderated_at&.iso8601,
              moderator_name: review.moderator_name,
              moderator_note: review.moderator_note,
              discarded_at: review.discarded_at&.iso8601,
              images: images_data,
              customer: customer_data,
              product: product_data,
              moderation_audits: audits_data,
              reports: reports_data
            )
          end
        end
      end
    end
  end
end

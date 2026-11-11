module Spree
  module Api
    module V3
      module Admin
        class ReviewsController < ResourceController
          scoped_resource :reviews
          BULK_ACTIONS = %w[approve reject hide unhide mark_spam restore pending delete].freeze

          # POST /api/v3/admin/reviews/bulk
          def bulk
            action_type = (params[:action_type].presence || params[:bulk_action].presence).to_s
            unless BULK_ACTIONS.include?(action_type)
              return render json: { error: { code: 'invalid_action', message: "Unsupported bulk action: #{action_type}" } }, status: :unprocessable_entity
            end

            ability_action = action_type == 'delete' ? :destroy : :update
            authorize! ability_action, Spree::Review

            raw_ids = Array(params[:ids]).map(&:to_s).reject(&:blank?).uniq
            if raw_ids.empty?
              return render json: { error: { code: 'missing_ids', message: 'At least one review id is required' } }, status: :unprocessable_entity
            end

            decoded_ids = raw_ids.filter_map do |raw_id|
              if Spree::PrefixedId.prefixed_id?(raw_id)
                Spree::Review.find_by_prefix_id(raw_id)&.id
              elsif Spree::Review.columns_hash['id']&.type == :integer
                Integer(raw_id, 10) rescue nil
              else
                raw_id
              end
            end

            reviews = resource_scope.accessible_by(current_ability, ability_action).where(id: decoded_ids)
            note = params[:moderator_note].presence
            processed = 0

            reviews.find_each do |review|
              case action_type
              when 'approve' then review.approve!(moderator: current_actor, note: note)
              when 'reject' then review.reject!(moderator: current_actor, note: note)
              when 'hide' then review.hide!(moderator: current_actor, note: note)
              when 'unhide' then review.unhide!(moderator: current_actor, note: note)
              when 'mark_spam' then review.mark_spam!(moderator: current_actor, note: note)
              when 'restore' then review.restore!(moderator: current_actor, note: note)
              when 'pending' then review.restore!(moderator: current_actor, note: note, audit_action: :pending)
              when 'delete' then review.destroy!
              end
              processed += 1
            end

            render json: { data: { count: processed, action_type: action_type } }
          end

          # GET /api/v3/admin/reviews/counts
          def counts
            authorize! :read, Spree::Review
            base = model_class.for_store(current_store).accessible_by(current_ability, :read).not_discarded
            render json: {
              data: {
                all: base.count,
                total: base.count,
                pending: base.pending.count,
                approved: base.approved.count,
                rejected: base.rejected.count,
                spam: base.spam.count,
                hidden: base.hidden.count,
                flagged: base.flagged.count
              }
            }
          end

          # PATCH /api/v3/admin/reviews/:id
          def update
            note = params[:moderator_note].presence
            @resource.assign_attributes(permitted_params)
            if @resource.save
              @resource.record_audit!(action: :admin_edited, moderator: current_actor, note: note)
              render json: serialize_resource(@resource.reload)
            else
              render_errors(@resource.errors)
            end
          end

          # POST /api/v3/admin/reviews/:id/approve
          def approve
            @resource = find_resource
            authorize_resource!(@resource, :update)
            @resource.approve!(moderator: current_actor, note: params[:moderator_note])

            render json: serialize_resource(@resource.reload)
          end

          # POST /api/v3/admin/reviews/:id/reject
          def reject
            @resource = find_resource
            authorize_resource!(@resource, :update)
            @resource.reject!(moderator: current_actor, note: params[:moderator_note])

            render json: serialize_resource(@resource.reload)
          end

          # POST /api/v3/admin/reviews/:id/hide
          def hide
            @resource = find_resource
            authorize_resource!(@resource, :update)
            @resource.hide!(moderator: current_actor, note: params[:moderator_note])

            render json: serialize_resource(@resource.reload)
          end

          # POST /api/v3/admin/reviews/:id/unhide
          def unhide
            @resource = find_resource
            authorize_resource!(@resource, :update)
            @resource.unhide!(moderator: current_actor, note: params[:moderator_note])

            render json: serialize_resource(@resource.reload)
          end

          # POST /api/v3/admin/reviews/:id/mark_spam
          def mark_spam
            @resource = find_resource
            authorize_resource!(@resource, :update)
            @resource.mark_spam!(moderator: current_actor, note: params[:moderator_note])

            render json: serialize_resource(@resource.reload)
          end

          # POST /api/v3/admin/reviews/:id/restore
          def restore
            @resource = find_resource
            authorize_resource!(@resource, :update)
            @resource.restore!(moderator: current_actor, note: params[:moderator_note])

            render json: serialize_resource(@resource.reload)
          end

          # DELETE /api/v3/admin/reviews/:id/images/:media_id
          def destroy_media
            @resource = find_resource
            authorize_resource!(@resource, :update)
            @resource.remove_media!(params[:media_id], moderator: current_actor, note: params[:moderator_note])

            render json: serialize_resource(@resource.reload)
          end

          protected

          def resource_scope
            model_class.for_store(current_store)
          end

          def model_class
            Spree::Review
          end

          def serializer_class
            Spree::Api::V3::Admin::ReviewSerializer
          end

          def scope_includes
            [
              :product,
              :variant,
              :order,
              :store,
              :customer,
              :gift_card,
              :moderation_audits,
              :reports,
              review_media: { attachment_attachment: :blob },
              answers: [:question, :option]
            ]
          end

          def ransack_params
            return {} unless params[:q].is_a?(ActionController::Parameters) || params[:q].is_a?(Hash)

            super
          end

          def collection
            return @collection if @collection.present?

            @search = scope.includes(collection_includes).
                      preload_associations_lazily.
                      ransack(ransack_params, auth_object: ransack_auth_object)
            result = apply_custom_filters(@search.result(distinct: collection_distinct?))
            result = apply_collection_sort(result)
            @pagy, @collection = pagy(result, limit: limit, page: page)
            @collection
          end

          def apply_custom_filters(relation)
            raw_statuses = Array(params[:statuses].presence || params[:status].to_s.split(',')).
                           map { |value| value.to_s.strip.downcase }.
                           reject(&:blank?).
                           uniq

            rel = if raw_statuses.empty? || raw_statuses.include?('all')
                    relation.not_discarded
                  else
                    status_queries = raw_statuses.filter_map do |status_key|
                      case status_key
                      when 'pending' then Spree::Review.pending.select(:id)
                      when 'approved' then Spree::Review.approved.select(:id)
                      when 'rejected' then Spree::Review.rejected.select(:id)
                      when 'spam' then Spree::Review.spam.select(:id)
                      when 'hidden' then Spree::Review.hidden.select(:id)
                      when 'flagged' then Spree::Review.flagged.select(:id)
                      when 'discarded' then Spree::Review.discarded.select(:id)
                      end
                    end

                    if status_queries.empty?
                      relation.not_discarded
                    else
                      combined = status_queries.reduce(nil) do |acc, sub|
                        part = Spree::Review.where(id: sub)
                        acc ? acc.or(part) : part
                      end
                      filtered = relation.where(id: combined.select(:id))
                      raw_statuses.include?('discarded') ? filtered : filtered.not_discarded
                    end
                  end

            if params[:product_id].present?
              prod_id = Spree::PrefixedId.prefixed_id?(params[:product_id]) ? Spree::Product.find_by_prefix_id(params[:product_id])&.id : params[:product_id]
              rel = prod_id ? rel.where(product_id: prod_id) : rel.none
            end

            rel = rel.where(rating: params[:rating].to_i) if params[:rating].present?

            if params[:verified_purchase].present?
              verified_flag = ActiveModel::Type::Boolean.new.cast(params[:verified_purchase])
              rel = rel.where(verified_purchase: verified_flag)
            end

            case params[:media_type].to_s
            when 'videos'
              rel = rel.where(id: Spree::Review.with_videos.select(:id))
            when 'images', 'photos'
              image_review_ids = Spree::Review.joins(review_media: { attachment_attachment: :blob }).
                                 where(active_storage_blobs: { content_type: Spree::ReviewMedia::IMAGE_CONTENT_TYPES }).
                                 select(:id)
              rel = rel.where(id: image_review_ids)
            when 'any'
              rel = rel.where(id: Spree::Review.with_images.select(:id))
            end

            search_term = if params[:search].present?
                            params[:search]
                          elsif params[:q].is_a?(String)
                            params[:q]
                          end
            if search_term.present?
              pattern = "%#{ActiveRecord::Base.sanitize_sql_like(search_term.to_s.downcase)}%"
              rel = rel.left_joins(:product).where(
                'LOWER(spree_reviews.title) LIKE :q OR LOWER(spree_reviews.body) LIKE :q OR LOWER(spree_reviews.reviewer_name) LIKE :q OR LOWER(spree_products.name) LIKE :q',
                q: pattern
              )
            end

            rel
          end

          def apply_collection_sort(collection)
            case params[:sort].to_s
            when 'oldest'
              collection.order(created_at: :asc, id: :asc)
            when 'rating_desc', 'highest_rating'
              collection.highest_rating_first
            when 'rating_asc', 'lowest_rating'
              collection.lowest_rating_first
            when 'helpful'
              collection.order(helpful_count: :desc, created_at: :desc, id: :desc)
            else
              return collection if params[:sort].present?

              collection.recent_first
            end
          end

          def permitted_params
            normalized = normalize_params(
              params.permit(
                :rating, :title, :body, :status, :hidden, :spam,
                :moderator_note, :reviewer_name, :locale, :ip_address,
                metadata: {}, public_metadata: {},
                review_media: [
                  :id, :alt, :position, :_destroy
                ],
                answers: [
                  :id, :question_id, :option_id,
                  :value_text, :value_number, :value_boolean, :_destroy
                ]
              )
            )

            decode_nested_ids(normalized, :review_media_attributes)
            decode_nested_ids(normalized, :answers_attributes)
            normalized
          end

          private

          def decode_nested_ids(params_hash, key)
            Array(params_hash[key]).each do |attributes|
              id = attributes[:id]
              next unless Spree::PrefixedId.prefixed_id?(id)

              attributes[:id] = Spree::PrefixedId.decode_prefixed_id(id)
            end
          end
        end
      end
    end
  end
end

module Spree
  module Api
    module V3
      module Store
        class ReviewsController < Store::BaseController
          include Spree::Api::V3::Store::ReviewProductLookup

          before_action :require_review_authentication!, only: :create
          before_action :require_authentication!, only: :update

          # GET /api/v3/store/products/:product_id/reviews
          def index
            unless store_settings[:enabled]
              return render json: { data: [], meta: { page: 1, limit: limit, count: 0, pages: 0 } }
            end

            reviews = filtered_reviews
            @pagy, records = pagy(reviews, page: page, limit: limit)

            render json: {
              data: records.map { |review| serializer_class.new(review, params: serializer_params).to_h },
              meta: collection_meta
            }
          end

          # POST /api/v3/store/products/:product_id/reviews
          def create
            unless store_settings[:enabled]
              return render_error(
                code: 'review_not_allowed',
                message: 'Product reviews are currently disabled for this store.',
                status: :forbidden
              )
            end

            eligibility = Spree::ReviewEligibility.new(
              product: @product,
              store: current_store,
              customer: current_user,
              variant: review_variant,
              order: review_order,
              settings: store_settings
            )
            return render_review_eligibility_error(eligibility) unless eligibility.can_review?

            review = @product.reviews.build(review_params)
            review.store = current_store
            review.customer = current_user
            review.locale ||= current_locale
            review.ip_address = request.remote_ip
            review.enforce_abuse_checks = true
            review.status = store_settings[:require_approval] ? 'pending' : 'approved'
            review.reviewer_name = reviewer_name_snapshot(current_user).presence || review.reviewer_name.presence

            if eligibility.eligible_order.present?
              purchased_variant = review_variant || Spree::ReviewablePurchase.new(
                order: eligibility.eligible_order, product: @product
              ).target_variant
              if purchased_variant.blank?
                errors = ActiveModel::Errors.new(Spree::Review.new)
                errors.add(:variant, :blank)
                return render_validation_error(errors)
              end

              review.variant = purchased_variant
              review.order = eligibility.eligible_order
              review.verified_purchase = true
            else
              review.variant = review_variant
              review.order = nil
              review.verified_purchase = false
            end

            assign_answers(review)
            assign_media(review)

            if review.errors.blank? && review.save
              review.reload
              render json: serializer_class.new(review, params: serializer_params).to_h, status: :created
            else
              render_validation_error(review.errors)
            end
          end

          # PATCH /api/v3/store/products/:product_id/reviews/:id
          def update
            review = @product.reviews.for_store(current_store).not_discarded.
                     where(customer_id: current_user.id).find_by_prefix_id!(params[:id])

            unless review_editing_enabled?
              return render_error(
                code: 'review_not_allowed',
                message: 'Editing submitted reviews is disabled by store settings.',
                status: :forbidden
              )
            end

            validate_and_apply_customer_update(review)
            apply_update_media(review) if review.errors.blank?

            review.reviewer_name = reviewer_name_snapshot(current_user) || review.reviewer_name
            review.status = 'pending' if store_settings[:require_approval]
            review.hidden = false
            review.spam = false
            review.enforce_abuse_checks = true

            saved = review.errors.blank? && ActiveRecord::Base.transaction do
              next false unless review.save

              normalize_review_media_positions!(review)
              true
            end

            if saved
              review.record_audit!(action: :customer_updated, moderator: current_user)
              render json: serializer_class.new(review.reload, params: serializer_params).to_h, status: :ok
            else
              render_validation_error(review.errors)
            end
          end

          private

          def store_settings
            @store_settings ||= Spree::ReviewSetting.for_store(current_store)
          end

          def require_review_authentication!
            return if store_settings[:allow_anonymous] && store_settings[:allow_unverified]

            require_authentication!
          end

          def filtered_reviews
            reviews = @product.reviews.approved.for_store(current_store).
                      includes(
                        :customer,
                        { variant: { option_values: :option_type } },
                        review_media: { attachment_attachment: :blob },
                        answers: [:question, :option]
                      )
            reviews = apply_rating_filter(reviews)
            reviews = reviews.with_images if truthy_param?(params[:with_images]) || truthy_param?(params[:with_media])
            reviews = reviews.with_videos if truthy_param?(params[:with_videos])
            reviews = reviews.verified_purchase if truthy_param?(params[:verified_purchase])
            reviews = apply_answer_filters(reviews)
            apply_sort(reviews)
          end

          def apply_rating_filter(reviews)
            ratings = array_param(params[:rating].presence || params[:ratings])
            ratings.present? ? reviews.with_rating(ratings) : reviews
          end

          def apply_answer_filters(reviews)
            answer_filters.each do |question_key, values|
              reviews = reviews.with_answer(question_key: question_key, values: values)
            end
            reviews
          end

          def apply_sort(reviews)
            case params[:sort].to_s
            when 'highest_rating'
              reviews.highest_rating_first
            when 'lowest_rating'
              reviews.lowest_rating_first
            when 'most_helpful'
              reviews.order(helpful_count: :desc, created_at: :desc, id: :desc)
            else
              reviews.recent_first
            end
          end

          def review_params
            permitted = params.permit(:rating, :title, :body, :review, :name, :reviewer_name, :show_identifier, :locale, metadata: {}).to_h
            permitted['body'] ||= permitted.delete('review') if permitted.key?('review')
            permitted['reviewer_name'] ||= permitted.delete('name') if permitted.key?('name')
            permitted.slice('rating', 'title', 'body', 'reviewer_name', 'show_identifier', 'locale', 'metadata')
          end

          def assign_answers(review)
            submitted_answers.each do |answer_payload|
              question = find_question(answer_payload[:question_id], answer_payload[:key])

              if question.blank?
                review.errors.add(:answers, :invalid)
                next
              end

              build_answers_for_question(review, question, answer_payload)
            end

            validate_required_answers(review)
          end

          def assign_media(review, position_offset: 0)
            submitted_images.each_with_index do |image_payload, index|
              signed_id = image_payload[:signed_id].presence || image_payload[:blob_signed_id].presence

              if signed_id.blank?
                review.errors.add(:review_media, :blank)
                next
              end

              blob = ActiveStorage::Blob.find_signed!(signed_id)
              media = review.review_media.build(
                alt: image_payload[:alt],
                position: image_payload[:position].presence || (position_offset + index)
              )
              media.attachment.attach(blob)
            end
          rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveRecord::RecordNotFound
            review.errors.add(:review_media, :invalid)
          end

          def review_editing_enabled?
            store_settings[:allow_edit_rating] ||
              store_settings[:allow_edit_title] ||
              store_settings[:allow_edit_body] ||
              store_settings[:allow_edit_remove_media] ||
              store_settings[:allow_edit_add_media]
          end

          def validate_and_apply_customer_update(review)
            attrs = review_params

            if attrs.key?('rating') && attrs['rating'].to_i != review.rating
              if store_settings[:allow_edit_rating]
                review.rating = attrs['rating']
              else
                review.errors.add(:rating, 'cannot be changed for submitted reviews.')
              end
            end

            if attrs.key?('title') && attrs['title'].to_s != review.title.to_s
              if store_settings[:allow_edit_title]
                review.title = attrs['title']
              else
                review.errors.add(:title, 'cannot be edited for submitted reviews.')
              end
            end

            if attrs.key?('body') && attrs['body'].to_s != review.body.to_s
              if store_settings[:allow_edit_body]
                review.body = attrs['body']
              else
                review.errors.add(:body, 'cannot be edited for submitted reviews.')
              end
            end

            review.show_identifier = attrs['show_identifier'] if attrs.key?('show_identifier')
            review.locale = attrs['locale'] if attrs.key?('locale')
            review.metadata = attrs['metadata'] if attrs.key?('metadata')

            if params.key?(:answers) && review.errors.blank?
              review.answers.each(&:mark_for_destruction)
              assign_answers(review)
            end
          end

          def apply_update_media(review)
            remove_ids = Array(params[:remove_media_ids]).map(&:to_s).compact_blank
            if remove_ids.any?
              unless store_settings[:allow_edit_remove_media]
                review.errors.add(:review_media, 'Removing existing media is disabled.')
                return
              end

              review.review_media.each do |media|
                next unless remove_ids.include?(media.prefixed_id) || remove_ids.include?(media.id.to_s)

                media.mark_for_destruction
              end
            end

            return if submitted_images.blank?

            unless store_settings[:allow_edit_add_media]
              review.errors.add(:review_media, 'Adding new photos or videos is disabled.')
              return
            end

            kept_count = review.review_media.reject(&:marked_for_destruction?).size
            assign_media(review, position_offset: kept_count)
          end

          def normalize_review_media_positions!(review)
            review.review_media.reload.order(:position, :id).each_with_index do |media, idx|
              media.update_column(:position, idx) if media.position != idx
            end
          end

          def submitted_answers
            raw_answers = params[:answers]
            return [] if raw_answers.blank?

            if raw_answers.respond_to?(:to_unsafe_h)
              raw_answers.to_unsafe_h.map do |key, value|
                { key: key, value: value }
              end
            else
              Array(raw_answers).filter_map do |item|
                next item.to_unsafe_h.symbolize_keys if item.respond_to?(:to_unsafe_h)
                next item.symbolize_keys if item.respond_to?(:symbolize_keys)
              end
            end
          end

          def submitted_images
            raw_images = params[:images].presence || params[:media]
            Array(raw_images).filter_map do |item|
              next item.to_unsafe_h.symbolize_keys if item.respond_to?(:to_unsafe_h)
              next item.symbolize_keys if item.respond_to?(:symbolize_keys)
            end
          end

          def build_answers_for_question(review, question, answer_payload)
            values = Array(answer_value(answer_payload))

            case question.kind
            when 'single_select', 'multi_select'
              values.each do |value|
                option = find_option(question, answer_payload[:option_id], value)
                if option.blank?
                  review.errors.add(:answers, :invalid)
                  next
                end

                review.answers.build(question: question, option: option)
              end
            when 'scale'
              review.answers.build(question: question, value_number: values.first)
            when 'boolean'
              review.answers.build(question: question, value_boolean: ActiveModel::Type::Boolean.new.cast(values.first))
            when 'text'
              review.answers.build(question: question, value_text: values.first)
            end
          end

          def find_question(question_id, key)
            @available_questions_by_key ||= Spree::ReviewQuestion.for_product(@product, store: current_store).index_by(&:key)
            @available_questions_by_id ||= Spree::ReviewQuestion.for_product(@product, store: current_store).index_by(&:prefixed_id)
            question_id.present? ? @available_questions_by_id[question_id] : @available_questions_by_key[key]
          end

          def find_option(question, option_id, value)
            options = question.options.active
            return options.find { |option| option.prefixed_id == option_id } if option_id.present?

            options.find { |option| option.value == value.to_s }
          end

          def validate_required_answers(review)
            answered_question_ids = review.answers.map(&:review_question_id).compact
            required_questions = Spree::ReviewQuestion.for_product(@product, store: current_store).where(required: true)

            required_questions.each do |question|
              review.errors.add(:answers, :blank) unless answered_question_ids.include?(question.id)
            end
          end

          def answer_filters
            raw_filters = params[:answers].presence || params[:answer_filters]
            return {} if raw_filters.blank?

            raw_filters = raw_filters.to_unsafe_h if raw_filters.respond_to?(:to_unsafe_h)
            return {} unless raw_filters.respond_to?(:each)

            raw_filters.each_with_object({}) do |(key, value), filters|
              values = array_param(value)
              filters[key] = values if values.present?
            end
          end

          def serializer_class
            Spree::Api::V3::ReviewSerializer
          end

          def serializer_params
            super.merge(ip_address: request.remote_ip)
          end

          def collection_meta
            {
              page: @pagy.page,
              limit: @pagy.limit,
              count: @pagy.count,
              pages: @pagy.pages,
              from: @pagy.from,
              to: @pagy.to,
              in: @pagy.in,
              previous: @pagy.previous,
              next: @pagy.next
            }
          end

          def page
            params[:page]&.to_i || 1
          end

          def limit
            [params[:limit]&.to_i || 25, 100].min
          end

          def array_param(value)
            Array(value).flat_map { |item| item.to_s.split(',') }.map(&:presence).compact
          end

          def answer_value(answer_payload)
            return answer_payload[:values] if answer_payload.key?(:values)
            return answer_payload[:value] if answer_payload.key?(:value)

            answer_payload[:option_value]
          end

          def truthy_param?(value)
            ActiveModel::Type::Boolean.new.cast(value)
          end

          def render_review_eligibility_error(eligibility)
            case eligibility.reason
            when Spree::ReviewEligibility::REASON_DISABLED
              render_error(
                code: 'review_not_allowed',
                message: 'Product reviews are currently disabled.',
                status: :forbidden,
                details: review_eligibility_error_details(eligibility)
              )
            when Spree::ReviewEligibility::REASON_ALREADY_REVIEWED
              render_error(
                code: 'review_already_exists',
                message: 'You have already reviewed this purchase.',
                status: :unprocessable_content,
                details: review_eligibility_error_details(eligibility)
              )
            else
              render_error(
                code: 'review_not_allowed',
                message: 'Only verified buyers can review this product.',
                status: :forbidden,
                details: review_eligibility_error_details(eligibility)
              )
            end
          end

          def review_eligibility_error_details(eligibility)
            {
              reason: eligibility.reason,
              product_id: @product.prefixed_id,
              variant_id: eligibility.variant&.prefixed_id,
              order_id: (eligibility.eligible_order || eligibility.order)&.prefixed_id,
              review_id: eligibility.existing_review&.prefixed_id,
              verified_purchase: eligibility.verified_purchase?,
              already_reviewed: eligibility.already_reviewed?
            }
          end

          def reviewer_name_snapshot(user)
            Spree::Review.profile_reviewer_name_from_user(user)
          end
        end
      end
    end
  end
end

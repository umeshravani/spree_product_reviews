module Spree
  module Api
    module V3
      module Store
        class ReviewFiltersController < Store::BaseController
          include Spree::Api::V3::Store::ReviewProductLookup

          # GET /api/v3/store/products/:product_id/reviews/filters
          def index
            settings = Spree::ReviewSetting.for_store(current_store)
            unless settings[:enabled]
              return render json: {
                filters: [],
                sort_options: sort_options,
                default_sort: 'most_recent',
                total_count: 0
              }
            end

            render json: {
              filters: filters,
              sort_options: sort_options,
              default_sort: 'most_recent',
              total_count: reviews.count
            }
          end

          private

          def filters
            list = [
              rating_filter,
              images_filter,
              verified_purchase_filter
            ]
            list << videos_filter if Spree::ReviewSetting.for_store(current_store)[:allow_videos]
            list.concat(question_filters)
            list
          end

          def videos_filter
            {
              id: 'with_videos',
              type: 'boolean',
              label: 'With videos',
              values: [
                { value: 'true', label: 'With videos', count: reviews.with_videos.count }
              ]
            }
          end

          def rating_filter
            counts = reviews.group(:rating).count

            {
              id: 'rating',
              type: 'rating',
              label: 'Rating',
              values: (1..5).to_a.reverse.map do |rating|
                { value: rating.to_s, label: "#{rating} stars", count: counts.fetch(rating, 0) }
              end
            }
          end

          def images_filter
            {
              id: 'with_images',
              type: 'boolean',
              label: 'With photos',
              values: [
                { value: 'true', label: 'With photos', count: reviews.with_images.count }
              ]
            }
          end

          def verified_purchase_filter
            {
              id: 'verified_purchase',
              type: 'boolean',
              label: 'Verified purchase',
              values: [
                { value: 'true', label: 'Verified purchase', count: reviews.verified_purchase.count }
              ]
            }
          end

          def question_filters
            Spree::ReviewQuestion.for_product(@product, store: current_store).filterable.map do |question|
              {
                id: question.key,
                question_id: question.prefixed_id,
                type: question.kind,
                label: question.label,
                values: question_filter_values(question)
              }
            end
          end

          def question_filter_values(question)
            case question.kind
            when 'single_select', 'multi_select'
              option_counts(question).then do |counts|
                question.options.active.ordered.map do |option|
                  { value: option.value, label: option.label, count: counts.fetch(option.id, 0) }
                end
              end
            when 'scale'
              reviews.joins(:answers).where(spree_review_answers: { review_question_id: question.id }).
                group('spree_review_answers.value_number').count.map do |value, count|
                  { value: value.to_s, label: value.to_s, count: count }
                end
            when 'boolean'
              reviews.joins(:answers).where(spree_review_answers: { review_question_id: question.id }).
                group('spree_review_answers.value_boolean').count.map do |value, count|
                  { value: value.to_s, label: value ? 'Yes' : 'No', count: count }
                end
            else
              []
            end
          end

          def option_counts(question)
            reviews.joins(:answers).
              where(spree_review_answers: { review_question_id: question.id }).
              group('spree_review_answers.review_question_option_id').
              count
          end

          def sort_options
            [
              { id: 'most_recent', label: 'Most recent' },
              { id: 'highest_rating', label: 'Highest rating' },
              { id: 'lowest_rating', label: 'Lowest rating' },
              { id: 'most_helpful', label: 'Most helpful' }
            ]
          end

          def reviews
            @reviews ||= begin
              reviews = @product.reviews.approved.for_store(current_store)
              reviews = reviews.verified_purchase if truthy_param?(params[:verified_purchase])
              reviews
            end
          end

          def truthy_param?(value)
            ActiveModel::Type::Boolean.new.cast(value)
          end

        end
      end
    end
  end
end

module Spree
  module Api
    module V3
      module Store
        class ReviewVotesController < Store::BaseController
          include Spree::Api::V3::Store::StorefrontProducts

          before_action :set_review

          # POST /api/v3/store/reviews/:review_id/helpful_votes
          def create
            vote = existing_vote
            selected_vote = vote_params[:vote]

            if vote&.vote == selected_vote
              vote.destroy!
              render_review(status: :ok)
            else
              vote ||= @review.votes.build
              vote.assign_attributes(vote: selected_vote)
              vote.customer = current_user if current_user
              vote.ip_address = request.remote_ip if current_user.blank?

              if vote.save
                render_review(status: vote.previous_changes.key?('id') ? :created : :ok)
              else
                render_validation_error(vote.errors)
              end
            end
          end

          private

          def set_review
            @review = Spree::Review.approved.for_store(current_store).
                      where(product_id: storefront_products.select(:id)).
                      find_by_prefix_id!(params[:review_id])
          end

          def vote_params
            permitted = params.permit(:vote).to_h
            permitted[:vote] = 'helpful' if permitted[:vote].blank?
            permitted
          end

          def existing_vote
            return @review.votes.find_by(customer: current_user) if current_user

            @review.votes.find_by(ip_address: request.remote_ip)
          end

          def render_review(status:)
            render json: Spree::Api::V3::ReviewSerializer.new(@review.reload, params: serializer_params).to_h, status: status
          end

          def serializer_params
            super.merge(ip_address: request.remote_ip)
          end
        end
      end
    end
  end
end

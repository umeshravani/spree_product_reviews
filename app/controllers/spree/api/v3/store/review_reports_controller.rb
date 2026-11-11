require 'digest'

module Spree
  module Api
    module V3
      module Store
        class ReviewReportsController < Store::BaseController
          before_action :find_review

          # POST /api/v3/store/reviews/:review_id/reports
          def create
            report = @review.reports.build(
              reason: report_params[:reason].presence || 'inappropriate',
              details: report_params[:details],
              customer: current_user,
              ip_hash: compute_ip_hash
            )

            if report.save
              render json: {
                reported: true,
                flagged_count: @review.reload.flagged_count
              }, status: :created
            else
              render_validation_error(report.errors)
            end
          end

          private

          def find_review
            @review = Spree::Review.approved.for_store(current_store).find_by_prefix_id!(params[:review_id])
          end

          def report_params
            params.permit(:reason, :details)
          end

          def compute_ip_hash
            ip = request.remote_ip.to_s
            return if ip.blank?

            salt = Rails.application.secret_key_base.presence || 'spree_reviews_ip_salt'
            Digest::SHA256.hexdigest("#{salt}:#{ip}")[0..31]
          end
        end
      end
    end
  end
end


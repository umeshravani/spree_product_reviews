# frozen_string_literal: true

module SpreeProductReviews
  class LegacyUserMigrator
    class << self
      def migrate!(verbose: false, dry_run: false)
        connection = ActiveRecord::Base.connection
        return { mapped: 0, unmatched: 0, skipped: 0 } unless connection.table_exists?(:spree_product_reviews)

        has_customers = connection.table_exists?(:spree_customers)
        has_users = connection.table_exists?(:spree_users)

        unless has_customers && has_users
          log_info('[SpreeProductReviews] Legacy migration skipped: spree_customers or spree_users table not found.', verbose)
          return { mapped: 0, unmatched: 0, skipped: 0 }
        end

        customer_class = if defined?(Spree.customer_class) && Spree.customer_class.present?
                           Spree.customer_class.to_s.safe_constantize
                         end
        customer_class ||= Class.new(ActiveRecord::Base) { self.table_name = 'spree_customers' }

        user_class = Class.new(ActiveRecord::Base) { self.table_name = 'spree_users' }
        review_class = Class.new(ActiveRecord::Base) { self.table_name = 'spree_product_reviews' }

        unmigrated_reviews = review_class.where.not(user_id: nil).where(customer_id: nil)
        total_pending = unmigrated_reviews.count

        if total_pending.zero?
          log_info('[SpreeProductReviews] No pending unmigrated reviews found.', verbose)
          return { mapped: 0, unmatched: 0, skipped: 0 }
        end

        log_info("[SpreeProductReviews] Processing #{total_pending} legacy reviews for deterministic customer mapping...", verbose)

        mapped_count = 0
        unmatched_count = 0
        unmatched_details = []

        unmigrated_reviews.find_each do |review|
          legacy_user = user_class.find_by(id: review.user_id)
          if legacy_user.nil? || legacy_user[:email].blank?
            unmatched_count += 1
            unmatched_details << {
              review_id: review.id,
              user_id: review.user_id,
              reason: 'Legacy user not found or email blank'
            }
            next
          end

          normalized_email = legacy_user[:email].to_s.strip.downcase
          matched_customer = customer_class.where('LOWER(TRIM(email)) = ?', normalized_email).first

          if matched_customer
            review.update_columns(customer_id: matched_customer.id) unless dry_run
            mapped_count += 1
          else
            unmatched_count += 1
            unmatched_details << {
              review_id: review.id,
              user_id: review.user_id,
              email: normalized_email,
              reason: 'No matching Spree 6 customer with this email'
            }
          end
        end

        log_info("[SpreeProductReviews] Migration complete: #{mapped_count} mapped to customers, #{unmatched_count} unmatched (preserved with user_id).", verbose)
        if unmatched_details.any?
          log_info("[SpreeProductReviews] Unmatched reviews: #{unmatched_details.inspect}", verbose)
        end

        { mapped: mapped_count, unmatched: unmatched_count, unmatched_details: unmatched_details }
      end

      private

      def log_info(msg, verbose)
        Rails.logger.info(msg) if defined?(Rails.logger) && Rails.logger
        puts msg if verbose
      end
    end
  end
end


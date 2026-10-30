# frozen_string_literal: true

namespace :spree_product_reviews do
  desc 'Deterministically maps legacy Spree 5 user_id on reviews to Spree 6 customer_id using email matching. Set DRY_RUN=1 to preview.'
  task reconcile_legacy_users: :environment do
    dry_run = ENV['DRY_RUN'].to_s == '1' || ENV['DRY_RUN'].to_s.casecmp('true').zero?
    puts "Starting Spree Product Reviews legacy user reconciliation (dry_run: #{dry_run})..."

    result = SpreeProductReviews::LegacyUserMigrator.migrate!(verbose: true, dry_run: dry_run)

    puts '------------------------------------------------------------'
    puts "Reconciliation Results:"
    puts "  Successfully mapped: #{result[:mapped]}"
    puts "  Unmatched (preserved): #{result[:unmatched]}"
    if result[:unmatched_details].any?
      puts "  Unmatched review details:"
      result[:unmatched_details].each do |detail|
        puts "    - Review ##{detail[:review_id]}: User ##{detail[:user_id]} (#{detail[:email] || 'no email'}) -> #{detail[:reason]}"
      end
    end
    puts '------------------------------------------------------------'
  end
end

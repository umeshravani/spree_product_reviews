namespace :spree_product_reviews do
  desc 'Backfill legacy review order and variant links from shipped purchases'
  task backfill_review_purchase_links: :environment do
    dry_run = ActiveModel::Type::Boolean.new.cast(ENV.fetch('DRY_RUN', false))
    updated_count = 0
    skipped_count = 0

    Spree::ReviewPurchaseAttribution.backfill_scope.find_each do |review|
      if dry_run
        target = Spree::ReviewPurchaseAttribution.new(review).target
        target.present? ? updated_count += 1 : skipped_count += 1
        next
      end

      Spree::ReviewPurchaseAttribution.new(review).call ? updated_count += 1 : skipped_count += 1
    end

    action = dry_run ? 'would update' : 'updated'
    puts "spree_product_reviews:backfill_review_purchase_links #{action} #{updated_count} reviews, skipped #{skipped_count} reviews"
  end

  desc 'Refresh review verified_purchase flags from current order and return state'
  task refresh_verified_purchase: :environment do
    dry_run = ActiveModel::Type::Boolean.new.cast(ENV.fetch('DRY_RUN', false))
    updated_count = 0
    unchanged_count = 0

    Spree::ReviewVerifiedPurchaseStatus.refresh_scope.find_each do |review|
      sync = Spree::ReviewVerifiedPurchaseStatus.new(review)

      if sync.changed?
        updated_count += 1
        sync.call unless dry_run
      else
        unchanged_count += 1
      end
    end

    action = dry_run ? 'would update' : 'updated'
    puts "spree_product_reviews:refresh_verified_purchase #{action} #{updated_count} reviews, unchanged #{unchanged_count} reviews"
  end

  desc 'Recalculate materialized product review rating summaries for all products'
  task recalculate_ratings: :environment do
    count = 0
    Spree::Review.not_discarded.distinct.pluck(:product_id, :store_id).each do |product_id, store_id|
      next if product_id.blank? || store_id.blank?

      Spree::ProductReviewSummary.recalculate!(product_id: product_id, store_id: store_id)
      count += 1
    end
    puts "spree_product_reviews:recalculate_ratings updated #{count} product summaries"
  end
end

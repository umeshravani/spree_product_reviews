Rails.application.config.after_initialize do
  Rails.application.config.spree_admin.product_dropdown_partials << "spree_product_reviews/admin/product_reviews_dropdown"
  Spree::Ability.register_ability(Spree::ProductReviewsAbility)
  Spree::Ability.register_ability(Spree::ProductReviewsAbility)

  Rails.application.config.spree.page_sections << Spree::PageSections::AddAReview
  Rails.application.config.spree.page_blocks << Spree::PageBlocks::ProductReviewForm
end


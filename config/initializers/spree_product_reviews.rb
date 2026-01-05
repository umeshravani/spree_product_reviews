Rails.application.config.after_initialize do
  if Rails.application.config.respond_to?(:spree)
    Rails.application.config.spree.page_sections << Spree::PageSections::AddAReview
    Rails.application.config.spree.page_blocks << Spree::PageBlocks::ProductReviewForm
  end

  if Spree.respond_to?(:admin) && Spree.admin.respond_to?(:navigation)
    sidebar = Spree.admin.navigation.sidebar
    
    sidebar.add :reviews, label: :reviews, icon: 'star', url: :admin_reviews_path, position: 45, if: -> { can?(:manage, Spree::ProductReview) }
    sidebar.add :all_reviews, parent: :reviews, label: :product_reviews, url: :admin_reviews_path, active: -> { controller_name == 'reviews' }
    sidebar.add :review_settings, parent: :reviews, label: :review_settings, url: :edit_admin_review_settings_path, active: -> { controller_name == 'review_settings' }
  end
  
  Spree::Ability.register_ability(Spree::ProductReviewsAbility)
  Rails.application.config.spree_admin.product_dropdown_partials << "spree_product_reviews/admin/product_reviews_dropdown"
end

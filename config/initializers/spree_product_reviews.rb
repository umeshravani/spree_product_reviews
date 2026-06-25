Rails.application.config.to_prepare do
  if defined?(Spree)
    ability_class = "Spree::Ability".safe_constantize

    if ability_class
      if ability_class.respond_to?(:register_ability)
        # Pre-Spree 5.5 Legacy Registration
        ability_class.register_ability(Spree::ProductReviewsAbility)
      else
        # Spree 5.5+ Safe Initialization Merge
        ability_class.prepend(Module.new do
          def initialize(*args, **kwargs)
            # 1. Let Spree 5.5 load ALL core Admin Permission Sets first
            super
            # 2. Prevent recursive subclass loading
            if self.class == Spree::Ability
              # 3. Extract the single user argument the legacy extension expects
              user = args.first 
              merge(Spree::ProductReviewsAbility.new(user))
            end
          end
        end)
      end
    end
  end
end

Rails.application.config.after_initialize do
  if Rails.application.config.respond_to?(:spree)
    if Rails.application.config.spree.respond_to?(:page_sections) && Rails.application.config.spree.page_sections
      Rails.application.config.spree.page_sections << Spree::PageSections::AddAReview
    end

    if Rails.application.config.spree.respond_to?(:page_blocks) && Rails.application.config.spree.page_blocks
      Rails.application.config.spree.page_blocks << Spree::PageBlocks::ProductReviewForm
    end
  end

  if Spree.respond_to?(:admin) && Spree.admin.respond_to?(:navigation)
    sidebar = Spree.admin.navigation.sidebar
    
    sidebar.add :reviews, label: :reviews, icon: 'star', url: :admin_reviews_path, position: 45, if: -> { can?(:manage, Spree::ProductReview) }
    sidebar.add :all_reviews, parent: :reviews, label: :product_reviews, url: :admin_reviews_path, active: -> { controller_name == 'reviews' }
    sidebar.add :review_settings, parent: :reviews, label: :review_settings, url: :edit_admin_review_settings_path, active: -> { controller_name == 'review_settings' }
  end
  
  if Rails.application.config.respond_to?(:spree_admin) && Rails.application.config.spree_admin.respond_to?(:product_dropdown_partials) && Rails.application.config.spree_admin.product_dropdown_partials
    Rails.application.config.spree_admin.product_dropdown_partials << "spree_product_reviews/admin/product_reviews_dropdown"
  end
end

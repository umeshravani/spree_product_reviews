# frozen_string_literal: true

module Spree
  class ProductReviewsAbility
    if defined?(CanCan::Ability)
      include CanCan::Ability

      def initialize(user)
        return unless user

        if user.respond_to?(:has_spree_role?) && user.has_spree_role?('admin')
          can :manage, Spree::ProductReview
          can :manage, Spree::ReviewVote
        elsif user.persisted?
          can :create, Spree::ProductReview
          can [:update, :destroy], Spree::ProductReview do |review|
            (review.respond_to?(:customer_id) && review.customer_id == user.id) ||
              (review.respond_to?(:user_id) && review.user_id == user.id)
          end
          can :create, Spree::ReviewVote
        else
          can :read, Spree::ProductReview, approved: true, spam: false
        end
      end
    end
  end
end

module Spree
  class ProductReviewsAbility
    include CanCan::Ability

    def initialize(user)
      user ||= Spree.user_class.new
      Rails.logger.info "[ProductReviewsAbility] user=#{user.inspect}, roles=#{user.spree_roles.map(&:name).inspect}"
      if user.has_spree_role? "admin"
        can :manage, Spree::ProductReview
      elsif user.persisted?
        can :create, Spree::ProductReview
        can :update, Spree::ProductReview do |review|
          review.user_id == user.id
        end
        can :destroy, Spree::ProductReview do |review|
          review.user_id == user.id
        end
      else
        can :read, Spree::ProductReview, approved: true
        cannot :create, Spree::ProductReview
        cannot %i[update destroy], Spree::ProductReview
      end
    end
  end
end
# frozen_string_literal: true

class AddRewardsAndMetadataToSpreeProductReviews < ActiveRecord::Migration[7.0]
  def change
    add_column :spree_product_reviews, :metadata, :jsonb, default: {} unless column_exists?(:spree_product_reviews, :metadata)
    add_column :spree_product_reviews, :reward_code, :string unless column_exists?(:spree_product_reviews, :reward_code)
    add_column :spree_product_reviews, :reward_amount, :decimal, precision: 10, scale: 2 unless column_exists?(:spree_product_reviews, :reward_amount)
    add_column :spree_product_reviews, :reward_gift_card_id, :integer unless column_exists?(:spree_product_reviews, :reward_gift_card_id)

    add_index :spree_product_reviews, :reward_code unless index_exists?(:spree_product_reviews, :reward_code)
    add_index :spree_product_reviews, :reward_gift_card_id unless index_exists?(:spree_product_reviews, :reward_gift_card_id)
  end
end

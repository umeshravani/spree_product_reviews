class AddReviewInfoToProducts < ActiveRecord::Migration[7.2]
  def change
    unless column_exists?(:spree_products, :average_rating)
      add_column :spree_products, :average_rating, :decimal,
                 precision: 7, scale: 5, default: 0.0, null: false
    end

    unless column_exists?(:spree_products, :review_count)
      add_column :spree_products, :review_count, :integer,
                 default: 0, null: false
    end
  end
end

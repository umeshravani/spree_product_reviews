class AddSpamToSpreeProductReviews < ActiveRecord::Migration[7.0]
  def change
    add_column :spree_product_reviews, :spam, :boolean, default: false, index: true
  end
end

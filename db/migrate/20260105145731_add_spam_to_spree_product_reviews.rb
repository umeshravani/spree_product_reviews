class AddSpamToSpreeProductReviews < ActiveRecord::Migration[7.0]
  def change
    unless column_exists?(:spree_product_reviews, :spam)
      add_column :spree_product_reviews, :spam, :boolean, default: false, index: true
    end
  end
end

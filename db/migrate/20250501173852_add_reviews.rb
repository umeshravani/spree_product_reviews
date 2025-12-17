class AddReviews < ActiveRecord::Migration[7.2]
  def change
    unless table_exists?(:spree_product_reviews)
      create_table :spree_product_reviews do |t|
        t.references :product, null: false, foreign_key: { to_table: :spree_products }
        t.references :user, null: false, foreign_key: { to_table: :spree_users }
        t.references :variant, foreign_key: { to_table: :spree_variants }

        t.integer :rating, null: false
        t.string :title, null: false
        t.string :review, null: false
        t.string :product_name, null: false
        t.datetime :purchase_date
        t.string :ip_address, null: false
        t.string :locale, null: false, default: "en"

        t.boolean :approved, default: false, null: false
        t.boolean :show_identifier, default: false, null: false

        t.timestamps
      end
    end

    add_index :spree_product_reviews, :product_id, name: "index_reviews_on_product_id" unless index_exists?(:spree_product_reviews, :product_id, name: "index_reviews_on_product_id")
    add_index :spree_product_reviews, :variant_id, name: "index_reviews_on_variant_id" unless index_exists?(:spree_product_reviews, :variant_id, name: "index_reviews_on_variant_id")
  end
end

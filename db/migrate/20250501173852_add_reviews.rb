class AddReviews < ActiveRecord::Migration[7.2]
  def change
    unless table_exists?(:spree_product_reviews)
      create_table :spree_product_reviews do |t|
        t.references :product, null: false, foreign_key: (table_exists?(:spree_products) ? { to_table: :spree_products } : false)
        if table_exists?(:spree_users)
          t.references :user, null: true, foreign_key: { to_table: :spree_users }
        else
          t.references :user, null: true
        end
        t.references :variant, foreign_key: (table_exists?(:spree_variants) ? { to_table: :spree_variants } : false)

        t.integer :rating, null: false
        t.string :title, null: false
        t.text :review, null: false
        t.string :product_name, null: true
        t.datetime :purchase_date
        t.string :ip_address, null: true
        t.string :locale, null: false, default: "en"

        t.boolean :approved, default: false, null: false
        t.boolean :show_identifier, default: true, null: false

        t.timestamps
      end
    end

    add_index :spree_product_reviews, :product_id, name: "index_reviews_on_product_id" unless index_exists?(:spree_product_reviews, :product_id, name: "index_reviews_on_product_id")
    add_index :spree_product_reviews, :variant_id, name: "index_reviews_on_variant_id" unless index_exists?(:spree_product_reviews, :variant_id, name: "index_reviews_on_variant_id")
  end
end

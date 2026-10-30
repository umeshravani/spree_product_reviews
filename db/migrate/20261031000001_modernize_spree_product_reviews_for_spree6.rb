# frozen_string_literal: true

class ModernizeSpreeProductReviewsForSpree6 < ActiveRecord::Migration[7.2]
  def change
    # 1. Adapt spree_product_reviews table
    if table_exists?(:spree_product_reviews)
      unless column_exists?(:spree_product_reviews, :customer_id)
        add_column :spree_product_reviews, :customer_id, :bigint
        add_index :spree_product_reviews, :customer_id unless index_exists?(:spree_product_reviews, :customer_id)
      end

      unless column_exists?(:spree_product_reviews, :order_id)
        add_column :spree_product_reviews, :order_id, :bigint
        add_index :spree_product_reviews, :order_id unless index_exists?(:spree_product_reviews, :order_id)
      end

      unless column_exists?(:spree_product_reviews, :verified_purchaser)
        add_column :spree_product_reviews, :verified_purchaser, :boolean, default: false, null: false
      end

      unless column_exists?(:spree_product_reviews, :helpful_count)
        add_column :spree_product_reviews, :helpful_count, :integer, default: 0, null: false
      end

      unless column_exists?(:spree_product_reviews, :unhelpful_count)
        add_column :spree_product_reviews, :unhelpful_count, :integer, default: 0, null: false
      end

      unless column_exists?(:spree_product_reviews, :name)
        add_column :spree_product_reviews, :name, :string
      end
    end

    # 2. Add product reviews toggle to spree_products
    if table_exists?(:spree_products) && !column_exists?(:spree_products, :reviews_allowed)
      add_column :spree_products, :reviews_allowed, :boolean, default: true, null: false
    end

    # 3. Create community helpful/unhelpful votes table
    unless table_exists?(:spree_review_votes)
      create_table :spree_review_votes do |t|
        t.references :review, null: false, foreign_key: { to_table: :spree_product_reviews }
        t.bigint :customer_id, index: true
        t.bigint :user_id, index: true
        t.string :ip_address
        t.boolean :helpful, default: true, null: false

        t.timestamps
      end

      add_index :spree_review_votes, [:review_id, :customer_id], unique: true, name: 'index_review_votes_on_review_and_customer'
      add_index :spree_review_votes, [:review_id, :ip_address], name: 'index_review_votes_on_review_and_ip'
    end

    # 4. Backward-compatible customer data migration bridge (non-destructive)
    if table_exists?(:spree_customers) && table_exists?(:spree_users)
      reversible do |dir|
        dir.up do
          execute <<-SQL
            UPDATE spree_product_reviews r
            SET customer_id = c.id
            FROM spree_users u
            JOIN spree_customers c ON LOWER(c.email) = LOWER(u.email)
            WHERE r.user_id = u.id AND r.customer_id IS NULL;
          SQL
        end
      end
    end
  end
end

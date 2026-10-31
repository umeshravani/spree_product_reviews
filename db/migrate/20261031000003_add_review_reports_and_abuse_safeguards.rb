# frozen_string_literal: true

class AddReviewReportsAndAbuseSafeguards < ActiveRecord::Migration[7.2]
  def change
    if table_exists?(:spree_product_reviews)
      unless column_exists?(:spree_product_reviews, :ip_hash)
        add_column :spree_product_reviews, :ip_hash, :string
        add_index :spree_product_reviews, :ip_hash unless index_exists?(:spree_product_reviews, :ip_hash)
      end

      unless column_exists?(:spree_product_reviews, :flagged_count)
        add_column :spree_product_reviews, :flagged_count, :integer, default: 0, null: false
        add_index :spree_product_reviews, :flagged_count unless index_exists?(:spree_product_reviews, :flagged_count)
      end

      unless column_exists?(:spree_product_reviews, :spam_score)
        add_column :spree_product_reviews, :spam_score, :integer, default: 0, null: false
      end
    end

    unless table_exists?(:spree_review_reports)
      create_table :spree_review_reports do |t|
        t.references :review, null: false, foreign_key: { to_table: :spree_product_reviews }, index: true
        t.bigint :customer_id, index: true
        t.string :reason, null: false
        t.text :details
        t.string :ip_hash
        t.string :status, default: 'pending', null: false
        t.datetime :moderated_at
        t.string :moderator_name
        t.text :moderator_note

        t.timestamps null: false
      end

      add_index :spree_review_reports, [:review_id, :status], name: 'index_review_reports_on_review_and_status'
      add_index :spree_review_reports, [:status, :created_at], name: 'index_review_reports_on_status_and_created_at'
    end
  end
end

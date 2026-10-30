# frozen_string_literal: true

class AddModerationAuditsAndSoftModerationToReviews < ActiveRecord::Migration[7.2]
  def change
    # 1. Soft moderation & lifecycle columns on spree_product_reviews
    if table_exists?(:spree_product_reviews)
      unless column_exists?(:spree_product_reviews, :hidden)
        add_column :spree_product_reviews, :hidden, :boolean, default: false, null: false
        add_index :spree_product_reviews, :hidden unless index_exists?(:spree_product_reviews, :hidden)
      end

      unless column_exists?(:spree_product_reviews, :rejected)
        add_column :spree_product_reviews, :rejected, :boolean, default: false, null: false
        add_index :spree_product_reviews, :rejected unless index_exists?(:spree_product_reviews, :rejected)
      end

      unless column_exists?(:spree_product_reviews, :discarded_at)
        add_column :spree_product_reviews, :discarded_at, :datetime
        add_index :spree_product_reviews, :discarded_at unless index_exists?(:spree_product_reviews, :discarded_at)
      end

      unless column_exists?(:spree_product_reviews, :moderated_at)
        add_column :spree_product_reviews, :moderated_at, :datetime
      end

      unless column_exists?(:spree_product_reviews, :moderator_name)
        add_column :spree_product_reviews, :moderator_name, :string
      end

      unless column_exists?(:spree_product_reviews, :moderator_note)
        add_column :spree_product_reviews, :moderator_note, :text
      end
    end

    # 2. Moderation audit log table
    unless table_exists?(:spree_review_moderation_audits)
      create_table :spree_review_moderation_audits do |t|
        t.references :review, null: false, foreign_key: { to_table: :spree_product_reviews }, index: true
        t.string :action, null: false
        t.string :moderator_name
        t.bigint :moderator_id
        t.string :moderator_type
        t.text :note
        t.string :metadata

        t.timestamps null: false
      end

      add_index :spree_review_moderation_audits, [:review_id, :created_at], name: 'index_review_audits_on_review_and_created_at'
    end
  end
end

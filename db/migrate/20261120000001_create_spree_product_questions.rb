class CreateSpreeProductQuestions < ActiveRecord::Migration[7.2]
  def change
    unless table_exists?(:spree_product_questions)
      create_table :spree_product_questions do |t|
        t.references :store, null: false, index: false
        t.references :product, null: false, index: false
        t.string :author_name, null: false
        t.string :author_email, null: false
        t.text :question, null: false
        t.text :answer
        t.string :answered_by
        t.string :status, null: false, default: 'pending'
        t.datetime :answered_at
        t.timestamps
      end

      add_index :spree_product_questions, [:store_id, :product_id, :status], name: 'idx_spree_product_questions_lookup'
      add_index :spree_product_questions, [:product_id, :status], name: 'idx_spree_product_questions_prod_status'
      add_index :spree_product_questions, [:store_id, :status], name: 'idx_spree_product_questions_store_status'
    end
  end
end

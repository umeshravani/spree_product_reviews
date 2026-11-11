class CreateSpreeProductReviewsV2Tables < ActiveRecord::Migration[7.2]
  def up
    ensure_spree_reviews_table
    ensure_spree_review_media_table
    ensure_spree_review_questions_tables
    ensure_spree_product_review_summaries_table
    ensure_spree_review_votes_table
    ensure_spree_review_settings_table
    ensure_spree_review_moderation_audits_table
    ensure_spree_review_reports_table
  end

  def down
    # Non-destructive down to protect upgraded storefront reviews and media.
  end

  private

  def json_column(table, name, **options)
    if table.respond_to?(:jsonb)
      table.jsonb name, **options
    else
      table.json name, **options
    end
  end

  def ensure_spree_reviews_table
    unless table_exists?(:spree_reviews)
      create_table :spree_reviews do |t|
        t.references :product, null: false, index: false
        t.references :store, null: false, index: false
        t.bigint :customer_id
        t.bigint :variant_id
        t.bigint :order_id
        t.integer :rating, null: false
        t.string :title, null: false
        t.text :body, null: false
        t.string :status, null: false
        t.boolean :verified_purchase, null: false, default: false
        t.string :reviewer_name
        t.string :locale
        t.string :ip_address
        t.integer :helpful_count, null: false, default: 0
        t.integer :not_helpful_count, null: false, default: 0
        json_column(t, :public_metadata)
        json_column(t, :metadata)
        t.boolean :hidden, null: false, default: false
        t.boolean :spam, null: false, default: false
        t.integer :spam_score, null: false, default: 0
        t.integer :flagged_count, null: false, default: 0
        t.string :ip_hash
        t.boolean :show_identifier, null: false, default: true
        t.datetime :moderated_at
        t.string :moderator_name
        t.text :moderator_note
        t.datetime :discarded_at
        t.string :reward_code
        t.decimal :reward_amount, precision: 10, scale: 2
        t.bigint :reward_gift_card_id
        t.timestamps
      end
    else
      if column_exists?(:spree_reviews, :user_id) && !column_exists?(:spree_reviews, :customer_id)
        rename_column :spree_reviews, :user_id, :customer_id
      end
      if column_exists?(:spree_reviews, :private_metadata) && !column_exists?(:spree_reviews, :metadata)
        rename_column :spree_reviews, :private_metadata, :metadata
      end

      add_column :spree_reviews, :customer_id, :bigint unless column_exists?(:spree_reviews, :customer_id)
      add_column :spree_reviews, :variant_id, :bigint unless column_exists?(:spree_reviews, :variant_id)
      add_column :spree_reviews, :order_id, :bigint unless column_exists?(:spree_reviews, :order_id)
      add_column :spree_reviews, :public_metadata, :json unless column_exists?(:spree_reviews, :public_metadata)
      add_column :spree_reviews, :metadata, :json unless column_exists?(:spree_reviews, :metadata)
      add_column :spree_reviews, :hidden, :boolean, default: false, null: false unless column_exists?(:spree_reviews, :hidden)
      add_column :spree_reviews, :spam, :boolean, default: false, null: false unless column_exists?(:spree_reviews, :spam)
      add_column :spree_reviews, :spam_score, :integer, default: 0, null: false unless column_exists?(:spree_reviews, :spam_score)
      add_column :spree_reviews, :flagged_count, :integer, default: 0, null: false unless column_exists?(:spree_reviews, :flagged_count)
      add_column :spree_reviews, :ip_hash, :string unless column_exists?(:spree_reviews, :ip_hash)
      add_column :spree_reviews, :show_identifier, :boolean, default: true, null: false unless column_exists?(:spree_reviews, :show_identifier)
      add_column :spree_reviews, :moderated_at, :datetime unless column_exists?(:spree_reviews, :moderated_at)
      add_column :spree_reviews, :moderator_name, :string unless column_exists?(:spree_reviews, :moderator_name)
      add_column :spree_reviews, :moderator_note, :text unless column_exists?(:spree_reviews, :moderator_note)
      add_column :spree_reviews, :discarded_at, :datetime unless column_exists?(:spree_reviews, :discarded_at)
      add_column :spree_reviews, :reward_code, :string unless column_exists?(:spree_reviews, :reward_code)
      add_column :spree_reviews, :reward_amount, :decimal, precision: 10, scale: 2 unless column_exists?(:spree_reviews, :reward_amount)
      add_column :spree_reviews, :reward_gift_card_id, :bigint unless column_exists?(:spree_reviews, :reward_gift_card_id)
    end

    ensure_spree_reviews_indexes
  end

  def ensure_spree_reviews_indexes
    unless index_name_exists?(:spree_reviews, 'idx_spree_reviews_public_lookup')
      add_index :spree_reviews, [:store_id, :product_id, :status], name: 'idx_spree_reviews_public_lookup'
    end
    unless index_name_exists?(:spree_reviews, 'idx_spree_reviews_product_rating')
      add_index :spree_reviews, [:product_id, :rating], name: 'idx_spree_reviews_product_rating'
    end
    unless index_name_exists?(:spree_reviews, 'idx_spree_reviews_product_created_at')
      add_index :spree_reviews, [:product_id, :created_at], name: 'idx_spree_reviews_product_created_at'
    end
    unless index_name_exists?(:spree_reviews, 'idx_spree_reviews_user_id')
      add_index :spree_reviews, :customer_id, name: 'idx_spree_reviews_user_id'
    end
    unless index_name_exists?(:spree_reviews, 'idx_spree_reviews_variant_id')
      add_index :spree_reviews, :variant_id, name: 'idx_spree_reviews_variant_id'
    end
    unless index_name_exists?(:spree_reviews, 'idx_spree_reviews_order_id')
      add_index :spree_reviews, :order_id, name: 'idx_spree_reviews_order_id'
    end
    unless index_name_exists?(:spree_reviews, 'idx_spree_reviews_ip_hash')
      add_index :spree_reviews, :ip_hash, name: 'idx_spree_reviews_ip_hash'
    end
    unless index_name_exists?(:spree_reviews, 'idx_spree_reviews_discarded_at')
      add_index :spree_reviews, :discarded_at, name: 'idx_spree_reviews_discarded_at'
    end

    if connection.supports_partial_index?
      unless index_name_exists?(:spree_reviews, 'idx_spree_reviews_unique_order_variant')
        add_index :spree_reviews, [:store_id, :order_id, :product_id, :variant_id, :customer_id],
                  unique: true,
                  where: 'order_id IS NOT NULL AND customer_id IS NOT NULL AND variant_id IS NOT NULL',
                  name: 'idx_spree_reviews_unique_order_variant'
      end
      unless index_name_exists?(:spree_reviews, 'idx_spree_reviews_unique_order_product')
        add_index :spree_reviews, [:store_id, :order_id, :product_id, :customer_id],
                  unique: true,
                  where: 'order_id IS NOT NULL AND customer_id IS NOT NULL AND variant_id IS NULL',
                  name: 'idx_spree_reviews_unique_order_product'
      end
    else
      unless index_name_exists?(:spree_reviews, 'idx_spree_reviews_unique_order_variant')
        add_index :spree_reviews, [:store_id, :order_id, :product_id, :variant_id, :customer_id],
                  unique: true,
                  name: 'idx_spree_reviews_unique_order_variant'
      end
      unless column_exists?(:spree_reviews, :product_level_review_key)
        execute <<~SQL
          ALTER TABLE spree_reviews
          ADD COLUMN product_level_review_key TINYINT
          GENERATED ALWAYS AS (CASE WHEN variant_id IS NULL THEN 1 ELSE NULL END) STORED
        SQL
      end
      unless index_name_exists?(:spree_reviews, 'idx_spree_reviews_unique_order_product')
        add_index :spree_reviews, [:store_id, :order_id, :product_id, :customer_id, :product_level_review_key],
                  unique: true,
                  name: 'idx_spree_reviews_unique_order_product'
      end
    end
  end

  def ensure_spree_review_media_table
    unless table_exists?(:spree_review_media)
      create_table :spree_review_media do |t|
        t.references :review, null: false, index: false
        t.integer :position, null: false, default: 0
        t.string :alt
        t.timestamps
      end
    end

    return if index_name_exists?(:spree_review_media, 'idx_spree_review_media_review_position')

    add_index :spree_review_media, [:review_id, :position], name: 'idx_spree_review_media_review_position'
  end

  def ensure_spree_review_questions_tables
    unless table_exists?(:spree_review_questions)
      create_table :spree_review_questions do |t|
        t.references :store, null: false, index: false
        t.references :product, index: false
        t.bigint :category_id
        t.string :key, null: false
        t.string :label, null: false
        t.string :kind, null: false
        t.string :applies_to, null: false
        t.boolean :filterable, null: false, default: false
        t.boolean :required, null: false, default: false
        t.boolean :active, null: false, default: true
        t.integer :position, null: false, default: 0
        t.timestamps
      end
    end

    unless index_name_exists?(:spree_review_questions, 'idx_spree_review_questions_store_key')
      add_index :spree_review_questions, [:store_id, :key], unique: true, name: 'idx_spree_review_questions_store_key'
    end
    unless index_name_exists?(:spree_review_questions, 'idx_spree_review_questions_scope')
      add_index :spree_review_questions, [:store_id, :applies_to, :position], name: 'idx_spree_review_questions_scope'
    end
    unless index_name_exists?(:spree_review_questions, 'idx_spree_review_questions_product_id')
      add_index :spree_review_questions, :product_id, name: 'idx_spree_review_questions_product_id'
    end
    unless index_name_exists?(:spree_review_questions, 'idx_spree_review_questions_category_id')
      add_index :spree_review_questions, :category_id, name: 'idx_spree_review_questions_category_id'
    end

    unless table_exists?(:spree_review_question_options)
      create_table :spree_review_question_options do |t|
        t.references :review_question, null: false, index: false
        t.string :value, null: false
        t.string :label, null: false
        t.boolean :active, null: false, default: true
        t.integer :position, null: false, default: 0
        t.timestamps
      end
    end

    unless index_name_exists?(:spree_review_question_options, 'idx_spree_review_options_question_value')
      add_index :spree_review_question_options, [:review_question_id, :value], unique: true,
                name: 'idx_spree_review_options_question_value'
    end
    unless index_name_exists?(:spree_review_question_options, 'idx_spree_review_options_question_position')
      add_index :spree_review_question_options, [:review_question_id, :position],
                name: 'idx_spree_review_options_question_position'
    end

    unless table_exists?(:spree_review_answers)
      create_table :spree_review_answers do |t|
        t.references :review, null: false, index: false
        t.references :review_question, null: false, index: false
        t.references :review_question_option, index: false
        t.text :value_text
        t.decimal :value_number, precision: 10, scale: 2
        t.boolean :value_boolean
        t.timestamps
      end
    end

    unless index_name_exists?(:spree_review_answers, 'idx_spree_review_answers_review_question')
      add_index :spree_review_answers, [:review_id, :review_question_id], name: 'idx_spree_review_answers_review_question'
    end
    unless index_name_exists?(:spree_review_answers, 'idx_spree_review_answers_option_id')
      add_index :spree_review_answers, :review_question_option_id, name: 'idx_spree_review_answers_option_id'
    end
  end

  def ensure_spree_product_review_summaries_table
    unless table_exists?(:spree_product_review_summaries)
      create_table :spree_product_review_summaries do |t|
        t.references :product, null: false, index: false
        t.references :store, null: false, index: false
        t.decimal :average_rating, precision: 3, scale: 2, null: false, default: 0.0
        t.integer :reviews_count, null: false, default: 0
        t.integer :rating_1_count, null: false, default: 0
        t.integer :rating_2_count, null: false, default: 0
        t.integer :rating_3_count, null: false, default: 0
        t.integer :rating_4_count, null: false, default: 0
        t.integer :rating_5_count, null: false, default: 0
        json_column(t, :summary_data)
        t.timestamps
      end
    end

    return if index_name_exists?(:spree_product_review_summaries, 'idx_spree_review_summaries_store_product')

    add_index :spree_product_review_summaries, [:store_id, :product_id], unique: true,
              name: 'idx_spree_review_summaries_store_product'
  end

  def ensure_spree_review_votes_table
    unless table_exists?(:spree_review_votes)
      create_table :spree_review_votes do |t|
        t.references :review, null: false, index: false
        t.bigint :customer_id
        t.string :ip_address
        t.string :vote, null: false
        t.timestamps
      end
    else
      if column_exists?(:spree_review_votes, :user_id) && !column_exists?(:spree_review_votes, :customer_id)
        rename_column :spree_review_votes, :user_id, :customer_id
      end
      add_column :spree_review_votes, :customer_id, :bigint unless column_exists?(:spree_review_votes, :customer_id)
      add_column :spree_review_votes, :vote, :string unless column_exists?(:spree_review_votes, :vote)
    end

    unless index_name_exists?(:spree_review_votes, 'idx_spree_review_votes_review_user')
      add_index :spree_review_votes, [:review_id, :customer_id], name: 'idx_spree_review_votes_review_user'
    end
    return if index_name_exists?(:spree_review_votes, 'idx_spree_review_votes_review_ip')

    add_index :spree_review_votes, [:review_id, :ip_address], name: 'idx_spree_review_votes_review_ip'
  end

  def ensure_spree_review_settings_table
    return if table_exists?(:spree_review_settings)

    create_table :spree_review_settings do |t|
      t.references :store, null: false, index: { unique: true, name: 'idx_spree_review_settings_store' }
      t.json :settings, null: false
      t.timestamps
    end
  end

  def ensure_spree_review_moderation_audits_table
    unless table_exists?(:spree_review_moderation_audits)
      create_table :spree_review_moderation_audits do |t|
        t.references :review, null: false, index: { name: 'idx_spree_review_audits_review' }
        t.string :action, null: false
        t.string :moderator_name
        t.bigint :moderator_id
        t.string :moderator_type
        t.text :note
        json_column(t, :metadata)
        t.timestamps
      end
      return
    end

    add_column :spree_review_moderation_audits, :metadata, :json unless column_exists?(:spree_review_moderation_audits, :metadata)
    unless index_name_exists?(:spree_review_moderation_audits, 'idx_spree_review_audits_review')
      add_index :spree_review_moderation_audits, :review_id, name: 'idx_spree_review_audits_review'
    end
  end

  def ensure_spree_review_reports_table
    unless table_exists?(:spree_review_reports)
      create_table :spree_review_reports do |t|
        t.references :review, null: false, index: { name: 'idx_spree_review_reports_review' }
        t.bigint :customer_id
        t.string :ip_hash
        t.string :reason, null: false
        t.text :details
        t.timestamps
      end
    else
      add_column :spree_review_reports, :customer_id, :bigint unless column_exists?(:spree_review_reports, :customer_id)
      add_column :spree_review_reports, :ip_hash, :string unless column_exists?(:spree_review_reports, :ip_hash)
    end

    unless index_name_exists?(:spree_review_reports, 'idx_spree_review_reports_review')
      add_index :spree_review_reports, :review_id, name: 'idx_spree_review_reports_review'
    end
    unless index_name_exists?(:spree_review_reports, 'idx_spree_review_reports_review_customer')
      add_index :spree_review_reports, [:review_id, :customer_id], name: 'idx_spree_review_reports_review_customer'
    end
    return if index_name_exists?(:spree_review_reports, 'idx_spree_review_reports_review_ip')

    add_index :spree_review_reports, [:review_id, :ip_hash], name: 'idx_spree_review_reports_review_ip'
  end
end


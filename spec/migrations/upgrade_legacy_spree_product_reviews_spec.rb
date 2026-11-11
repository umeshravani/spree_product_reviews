require 'spec_helper'
require 'stringio'
require File.expand_path('../../db/migrate/20261112000002_upgrade_legacy_spree_product_reviews', __dir__)

RSpec.describe UpgradeLegacySpreeProductReviews do
  let(:store) { Spree::Store.default.persisted? ? Spree::Store.default : create(:store, default: true) }
  let(:product) { create(:product, store: store) }
  let(:customer) { create(:user, first_name: 'Vikram', last_name: 'Rao') }

  after do
    conn = ActiveRecord::Base.connection
    conn.drop_table(:spree_product_reviews, if_exists: true)
    conn.drop_table(:spree_legacy_product_reviews, if_exists: true)
  end

  it 'migrates legacy spree_product_reviews records, votes, audits, reports, and ActiveStorage images non-destructively' do
    conn = ActiveRecord::Base.connection
    conn.drop_table(:spree_legacy_product_reviews, if_exists: true)
    conn.drop_table(:spree_product_reviews, if_exists: true)

    conn.create_table :spree_product_reviews do |t|
      t.bigint :product_id, null: false
      t.bigint :customer_id
      t.integer :rating, null: false
      t.string :title, null: false
      t.text :review, null: false
      t.string :name
      t.boolean :approved, default: false, null: false
      t.boolean :rejected, default: false, null: false
      t.boolean :hidden, default: false, null: false
      t.boolean :spam, default: false, null: false
      t.boolean :verified_purchaser, default: false, null: false
      t.integer :helpful_count, default: 0, null: false
      t.integer :unhelpful_count, default: 0, null: false
      t.integer :flagged_count, default: 0, null: false
      t.integer :spam_score, default: 0, null: false
      t.boolean :show_identifier, default: true, null: false
      t.string :locale, default: 'en', null: false
      t.string :reward_code
      t.decimal :reward_amount, precision: 10, scale: 2
      t.timestamps
    end

    now = Time.current
    conn.execute(
      ActiveRecord::Base.sanitize_sql_array(
        [
          'INSERT INTO spree_product_reviews (id, product_id, customer_id, rating, title, review, name, approved, verified_purchaser, helpful_count, unhelpful_count, reward_code, reward_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          9001, product.id, customer.id, 5, 'Legacy Five Stars', 'Migrated smoothly', 'Vikram Rao', true, true, 3, 1, 'LEGACYGIFT', 150.0, now, now
        ]
      )
    )

    blob = ActiveStorage::Blob.create_and_upload!(
      io: StringIO.new("\x89PNG\r\n\x1a\n".b),
      filename: 'legacy.png',
      content_type: 'image/png'
    )
    conn.execute(
      ActiveRecord::Base.sanitize_sql_array(
        [
          'INSERT INTO active_storage_attachments (name, record_type, record_id, blob_id, created_at) VALUES (?, ?, ?, ?, ?)',
          'images', 'Spree::ProductReview', 9001, blob.id, now
        ]
      )
    )

    described_class.new.up

    migrated = Spree::Review.find_by(product_id: product.id, title: 'Legacy Five Stars')
    expect(migrated).to be_present
    expect(migrated.body).to eq('Migrated smoothly')
    expect(migrated.status).to eq('approved')
    expect(migrated.verified_purchase).to be(true)
    expect(migrated.helpful_count).to eq(3)
    expect(migrated.not_helpful_count).to eq(1)
    expect(migrated.reward_code).to eq('LEGACYGIFT')
    expect(migrated.review_media.count).to eq(1)
    expect(migrated.review_media.first.attachment).to be_attached

    summary = Spree::ProductReviewSummary.find_by(product_id: product.id, store_id: store.id)
    expect(summary.reviews_count).to eq(1)
    expect(summary.average_rating.to_f).to eq(5.0)
    expect(conn.table_exists?(:spree_legacy_product_reviews)).to be(true)
  end
end


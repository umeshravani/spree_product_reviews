class UpgradeLegacySpreeProductReviews < ActiveRecord::Migration[7.2]
  class LegacyReviewRecord < ActiveRecord::Base
    self.table_name = 'spree_product_reviews'
  end

  class TargetReviewRecord < ActiveRecord::Base
    self.table_name = 'spree_reviews'
  end

  class TargetMediaRecord < ActiveRecord::Base
    self.table_name = 'spree_review_media'
  end

  def up
    prepare_shared_tables_from_v1
    return unless table_exists?(:spree_product_reviews)

    drop_legacy_foreign_keys_targeting(:spree_product_reviews)
    id_map = migrate_legacy_reviews
    remap_child_review_references(id_map)
    migrate_legacy_attachments(id_map)
    recalculate_product_summaries
    seed_default_review_settings

    unless table_exists?(:spree_legacy_product_reviews)
      rename_table :spree_product_reviews, :spree_legacy_product_reviews
    end
  end

  def down
    # Keep migrated data in spree_reviews safely without dropping production records.
  end

  private

  def prepare_shared_tables_from_v1
    if table_exists?(:spree_review_votes) && column_exists?(:spree_review_votes, :helpful)
      if column_exists?(:spree_review_votes, :vote)
        helpful_col = connection.columns(:spree_review_votes).find { |c| c.name == 'helpful' }
        truthy_sql = if helpful_col&.type == :boolean
                       "helpful = #{connection.quoted_true}"
                     else
                       'helpful = 1'
                     end

        execute <<~SQL.squish
          UPDATE spree_review_votes
          SET vote = CASE WHEN #{truthy_sql} THEN 'helpful' ELSE 'not_helpful' END
          WHERE vote IS NULL OR vote = ''
        SQL
      end
      change_column_null :spree_review_votes, :helpful, true
    end

    if table_exists?(:spree_review_votes) && column_exists?(:spree_review_votes, :vote)
      change_column_null :spree_review_votes, :vote, false
    end

    if table_exists?(:spree_review_reports) && column_exists?(:spree_review_reports, :status)
      change_column_null :spree_review_reports, :status, true
    end

    normalize_moderation_audit_metadata_column
  end

  def normalize_moderation_audit_metadata_column
    return unless table_exists?(:spree_review_moderation_audits)

    col = connection.columns(:spree_review_moderation_audits).find { |c| c.name == 'metadata' }
    return if col.blank? || col.type == :json || col.type == :jsonb

    if connection.adapter_name.downcase.include?('postgres')
      select_all('SELECT id, metadata FROM spree_review_moderation_audits WHERE metadata IS NOT NULL').each do |row|
        raw = row['metadata'].to_s.strip
        normalized = if raw.blank?
                       nil
                     else
                       begin
                         JSON.parse(raw).to_json
                       rescue JSON::ParserError
                         { 'legacy_note' => raw }.to_json
                       end
                     end
        execute(
          ActiveRecord::Base.sanitize_sql_array(
            ['UPDATE spree_review_moderation_audits SET metadata = ? WHERE id = ?', normalized, row['id']]
          )
        )
      end

      change_column_default(:spree_review_moderation_audits, :metadata, nil) unless col.default.nil?
      execute('ALTER TABLE spree_review_moderation_audits ALTER COLUMN metadata TYPE json USING NULLIF(BTRIM(metadata), \'\')::json')
    else
      change_column :spree_review_moderation_audits, :metadata, :json
    end
  end

  def drop_legacy_foreign_keys_targeting(target_table)
    %i[spree_review_votes spree_review_moderation_audits spree_review_reports].each do |table|
      next unless table_exists?(table)

      connection.foreign_keys(table).each do |fk|
        next unless fk.to_table.to_s == target_table.to_s

        remove_foreign_key table, name: fk.name
      end
    end
  end

  def migrate_legacy_reviews
    default_store_id = resolve_default_store_id
    return {} if default_store_id.blank?

    store_ids_by_product = load_product_store_map
    preserve_ids = TargetReviewRecord.none?
    id_map = {}

    LegacyReviewRecord.reset_column_information
    TargetReviewRecord.reset_column_information

    LegacyReviewRecord.order(:id).find_each do |legacy|
      store_id = store_ids_by_product[legacy.product_id] || default_store_id
      customer_id = legacy_attribute(legacy, :customer_id) || legacy_attribute(legacy, :user_id)
      variant_id = legacy_attribute(legacy, :variant_id)
      order_id = legacy_attribute(legacy, :order_id)

      duplicate = find_existing_target_review(
        store_id: store_id,
        product_id: legacy.product_id,
        variant_id: variant_id,
        order_id: order_id,
        customer_id: customer_id
      )
      if duplicate.present?
        id_map[legacy.id] = duplicate.id
        next
      end

      now = Time.current
      attrs = {
        product_id: legacy.product_id,
        store_id: store_id,
        customer_id: customer_id,
        variant_id: variant_id,
        order_id: order_id,
        rating: [[legacy_attribute(legacy, :rating).to_i, 1].max, 5].min,
        title: legacy_attribute(legacy, :title).to_s.strip.presence&.slice(0, 120) || 'Product review',
        body: legacy_attribute(legacy, :review).to_s,
        status: derived_status(legacy),
        verified_purchase: truthy?(legacy_attribute(legacy, :verified_purchaser)),
        reviewer_name: legacy_attribute(legacy, :name),
        locale: legacy_attribute(legacy, :locale).presence || 'en',
        ip_address: legacy_attribute(legacy, :ip_address),
        ip_hash: legacy_attribute(legacy, :ip_hash),
        helpful_count: legacy_attribute(legacy, :helpful_count).to_i,
        not_helpful_count: legacy_attribute(legacy, :unhelpful_count).to_i,
        flagged_count: legacy_attribute(legacy, :flagged_count).to_i,
        spam_score: legacy_attribute(legacy, :spam_score).to_i,
        hidden: truthy?(legacy_attribute(legacy, :hidden)),
        spam: truthy?(legacy_attribute(legacy, :spam)),
        show_identifier: legacy_attribute(legacy, :show_identifier).nil? ? true : truthy?(legacy_attribute(legacy, :show_identifier)),
        moderated_at: legacy_attribute(legacy, :moderated_at),
        moderator_name: legacy_attribute(legacy, :moderator_name),
        moderator_note: legacy_attribute(legacy, :moderator_note),
        discarded_at: legacy_attribute(legacy, :discarded_at),
        reward_code: legacy_attribute(legacy, :reward_code),
        reward_amount: legacy_attribute(legacy, :reward_amount),
        reward_gift_card_id: legacy_attribute(legacy, :reward_gift_card_id),
        public_metadata: { 'legacy_product_review_id' => legacy.id },
        metadata: legacy_metadata_hash(legacy_attribute(legacy, :metadata)),
        created_at: legacy_attribute(legacy, :created_at) || now,
        updated_at: legacy_attribute(legacy, :updated_at) || now
      }
      attrs[:id] = legacy.id if preserve_ids

      created = TargetReviewRecord.create!(attrs)
      id_map[legacy.id] = created.id
    end

    if preserve_ids && connection.respond_to?(:reset_pk_sequence!)
      connection.reset_pk_sequence!('spree_reviews')
    end

    id_map
  end

  def find_existing_target_review(store_id:, product_id:, variant_id:, order_id:, customer_id:)
    return nil if order_id.blank? || customer_id.blank?

    TargetReviewRecord.find_by(
      store_id: store_id,
      order_id: order_id,
      product_id: product_id,
      variant_id: variant_id,
      customer_id: customer_id
    )
  end

  def remap_child_review_references(id_map)
    return if id_map.empty?

    changes = id_map.select { |old_id, new_id| old_id != new_id }
    return if changes.empty?

    %w[spree_review_votes spree_review_moderation_audits spree_review_reports].each do |table|
      next unless table_exists?(table)

      changes.each do |old_id, new_id|
        execute(
          ActiveRecord::Base.sanitize_sql_array(
            ["UPDATE #{table} SET review_id = ? WHERE review_id = ?", new_id, old_id]
          )
        )
      end
    end
  end

  def migrate_legacy_attachments(id_map)
    return if id_map.empty? || !table_exists?(:active_storage_attachments)

    rows = select_all(<<~SQL.squish)
      SELECT id, record_id
      FROM active_storage_attachments
      WHERE record_type = 'Spree::ProductReview'
      ORDER BY id ASC
    SQL

    positions_by_review = Hash.new(0)
    rows.each do |row|
      old_review_id = row['record_id'].to_i
      new_review_id = id_map[old_review_id]
      next unless new_review_id

      position = positions_by_review[new_review_id]
      positions_by_review[new_review_id] += 1

      media = TargetMediaRecord.create!(
        review_id: new_review_id,
        position: position,
        created_at: Time.current,
        updated_at: Time.current
      )

      execute(
        ActiveRecord::Base.sanitize_sql_array(
          [
            "UPDATE active_storage_attachments SET record_type = 'Spree::ReviewMedia', record_id = ?, name = 'attachment' WHERE id = ?",
            media.id,
            row['id']
          ]
        )
      )
    end
  end

  def recalculate_product_summaries
    return unless defined?(Spree::ProductReviewSummary)

    TargetReviewRecord.where(discarded_at: nil).distinct.pluck(:product_id, :store_id).each do |product_id, store_id|
      next if product_id.blank? || store_id.blank?
      next unless Spree::Product.exists?(id: product_id) && Spree::Store.exists?(id: store_id)

      Spree::ProductReviewSummary.recalculate!(product_id: product_id, store_id: store_id)
    end
  end

  def seed_default_review_settings
    return unless table_exists?(:spree_stores) && defined?(Spree::ReviewSetting)

    store_ids = select_values('SELECT id FROM spree_stores')
    store_ids.each do |store_id|
      store = Spree::Store.find_by(id: store_id)
      next unless store
      next if Spree::ReviewSetting.exists?(store_id: store.id)

      Spree::ReviewSetting.create!(store: store, settings: Spree::ReviewSetting.default_hash.stringify_keys)
    end
  end

  def resolve_default_store_id
    return nil unless table_exists?(:spree_stores)

    row = select_one('SELECT id FROM spree_stores ORDER BY default_locale IS NOT NULL DESC, id ASC LIMIT 1')
    row&.dig('id')
  end

  def load_product_store_map
    return {} unless table_exists?(:spree_products_stores)

    select_all('SELECT product_id, store_id FROM spree_products_stores ORDER BY store_id ASC').each_with_object({}) do |row, map|
      map[row['product_id']] ||= row['store_id']
    end
  end

  def derived_status(legacy)
    return 'spam' if truthy?(legacy_attribute(legacy, :spam))
    return 'hidden' if truthy?(legacy_attribute(legacy, :hidden))
    return 'rejected' if truthy?(legacy_attribute(legacy, :rejected))
    return 'approved' if truthy?(legacy_attribute(legacy, :approved))

    'pending'
  end

  def legacy_metadata_hash(value)
    return value if value.is_a?(Hash)
    return JSON.parse(value) if value.is_a?(String) && value.strip.start_with?('{')

    {}
  rescue JSON::ParserError
    {}
  end

  def legacy_attribute(record, name)
    record.has_attribute?(name) ? record[name] : nil
  end

  def truthy?(val)
    ActiveModel::Type::Boolean.new.cast(val) ? true : false
  end
end

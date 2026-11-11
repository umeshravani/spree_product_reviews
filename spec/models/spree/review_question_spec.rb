require 'spec_helper'

RSpec.describe Spree::ReviewQuestion, type: :model do
  let(:store) { create(:store) }
  let(:product) { create(:product, store: store) }

  describe 'validations' do
    it 'generates an underscore key from the label when key is blank' do
      question = build(:review_question, store: store, label: 'Age range', key: nil)

      question.validate

      expect(question.key).to eq('age_range')
    end

    it 'normalizes manually entered keys to lowercase underscores' do
      question = build(:review_question, store: store, label: 'Age range', key: 'Age Range')

      question.validate

      expect(question.key).to eq('age_range')
    end

    it 'requires a product target for product-scoped questions' do
      question = build(:review_question, store: store, applies_to: 'product', product: nil)

      expect(question).not_to be_valid
      expect(question.errors[:product]).to be_present
    end

    it 'accepts a product target owned by the question store' do
      question = build(:review_question, store: store, applies_to: 'product', product: product)

      expect(question).to be_valid
    end

    it 'rejects a product target owned by another store' do
      question = build(
        :review_question,
        store: create(:store),
        applies_to: 'product',
        product: product
      )

      expect(question).not_to be_valid
      expect(question.errors[:product]).to be_present
    end

    it 'rejects a category owned by another store' do
      question = build(:review_question, :for_category, store: store, category: create(:category, store: create(:store)))

      expect(question).not_to be_valid
      expect(question.errors[:category]).to be_present
    end

    it 'rejects product targets on store-scoped questions' do
      question = build(:review_question, store: store, applies_to: 'store', product: product)

      expect(question).not_to be_valid
      expect(question.errors[:product]).to be_present
    end
  end

  describe '.for_product' do
    it 'returns active store, product, and category scoped questions for the product' do
      category = create(:category, store: store)
      product.categories << category

      store_question = create(:review_question, store: store, applies_to: 'store')
      product_question = create(:review_question, :for_product, store: store, product: product)
      category_question = create(:review_question, :for_category, store: store, category: category)
      create(:review_question, store: store, applies_to: 'store', active: false)
      create(:review_question, store: create(:store), applies_to: 'store')

      expect(described_class.for_product(product, store: store)).to contain_exactly(
        store_question,
        product_question,
        category_question
      )
    end

    it 'returns category questions configured on an ancestor category' do
      parent_category = create(:category, store: store)
      child_category = create(:category, store: store, parent: parent_category)
      product.categories << child_category
      ancestor_question = create(:review_question, :for_category, store: store, category: parent_category)

      expect(described_class.for_product(product, store: store)).to include(ancestor_question)
    end
  end
end

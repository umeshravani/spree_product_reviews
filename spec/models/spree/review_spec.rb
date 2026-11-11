require 'spec_helper'

RSpec.describe Spree::Review, type: :model do
  let(:store) { create(:store) }
  let(:product) { create(:product, store: store) }

  describe 'defaults' do
    it 'starts pending with zero vote counters and optional body' do
      review = described_class.new(product: product, store: store, rating: 5, title: 'Great fit')

      expect(review).to be_valid
      expect(review.status).to eq('pending')
      expect(review.verified_purchase).to be(false)
      expect(review.helpful_count).to eq(0)
      expect(review.not_helpful_count).to eq(0)

      review.validate

      expect(review.title).to eq('Great fit')
      expect(review.body).to eq('')
      expect(review.body_excerpt).to eq('No written review content')
    end
  end

  describe '#title_excerpt and #body_excerpt' do
    it 'summarizes long title and body text for list displays' do
      review = build(
        :review,
        product: product,
        store: store,
        title: 'A' * described_class::TITLE_MAX_LENGTH,
        body: 'B' * 160
      )

      expect(review.title_excerpt.length).to be <= described_class::TITLE_EXCERPT_LENGTH
      expect(review.title_excerpt).to end_with('...')
      expect(review.body_excerpt.length).to be <= described_class::BODY_EXCERPT_LENGTH
      expect(review.body_excerpt).to end_with('...')
    end
  end

  describe '#reviewer_display_name' do
    it 'formats full reviewer names as a first name and last initial' do
      review = build(:review, product: product, store: store, reviewer_name: 'Jacqueline Brown')

      expect(review.reviewer_display_name).to eq('Jacqueline B.')
    end

    it 'formats profile name parts without exposing a lone last name' do
      expect(described_class.public_reviewer_name_from_parts('Jacqueline', 'Brown')).
        to eq('Jacqueline B.')
      expect(described_class.public_reviewer_name_from_parts('Jacqueline', nil)).to eq('Jacqueline')
      expect(described_class.public_reviewer_name_from_parts(nil, 'Brown')).to eq('B.')
    end

    it 'uses the current profile name for associated users while keeping public display private' do
      user = create(:user, first_name: 'Jacqueline', last_name: 'Brown')
      review = create(:review, product: product, store: store, customer: user, reviewer_name: 'Old Name')

      expect(review.admin_reviewer_name).to eq('Jacqueline Brown')
      expect(review.reviewer_display_name).to eq('Jacqueline B.')

      user.update!(first_name: 'Solomia', last_name: 'Smith')

      expect(review.reload.admin_reviewer_name).to eq('Solomia Smith')
      expect(review.reviewer_display_name).to eq('Solomia S.')
    end
  end

  describe 'validations' do
    it 'accepts ratings from one to five' do
      expect(build(:review, product: product, store: store, rating: 5)).to be_valid
      expect(build(:review, product: product, store: store, rating: 6)).not_to be_valid
    end

    it 'requires a title for new reviews' do
      review = build(:review, product: product, store: store, title: '')

      expect(review).not_to be_valid
      expect(review.errors[:title]).to be_present
    end

    it 'limits new review titles' do
      review = build(:review, product: product, store: store, title: 'A' * (described_class::TITLE_MAX_LENGTH + 1))

      expect(review).not_to be_valid
      expect(review.errors[:title]).to be_present
    end

    it 'does not allow an existing review title to be cleared' do
      review = create(:review, product: product, store: store, title: 'Great fit')

      review.title = ''

      expect(review).not_to be_valid
      expect(review.errors[:title]).to be_present
    end

    it 'allows legacy blank-title reviews to be moderated' do
      review = create(:review, product: product, store: store)
      review.update_column(:title, '')

      review.status = 'approved'

      expect(review).to be_valid
    end

    it 'allows legacy long-title reviews to be moderated' do
      review = create(:review, product: product, store: store)
      review.update_column(:title, 'A' * 180)

      review.status = 'approved'

      expect(review).to be_valid
    end

    it 'requires the product to belong to the review store' do
      other_store = create(:store)
      review = build(:review, product: product, store: other_store)

      expect(review).not_to be_valid
      expect(review.errors[:product]).to be_present
    end

    it 'allows one review per customer, order, and product variant in a store' do
      user = create(:user)
      variant = create(:reviewable_variant, product: product)
      other_variant = create(:reviewable_variant, product: product)
      order = create(:shipped_order, customer: user, store: store, variants: [variant, other_variant])
      repeat_order = create(:shipped_order, customer: user, store: store, variants: [variant])
      create(:review, :for_variant, product: product, variant: variant, order: order, store: store, customer: user)

      duplicate = build(:review, :for_variant, product: product, variant: variant, order: order, store: store, customer: user)
      other_variant_review = build(:review, :for_variant, product: product, variant: other_variant, order: order, store: store, customer: user)
      repeat_order_review = build(:review, :for_variant, product: product, variant: variant, order: repeat_order, store: store, customer: user)

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:customer_id]).to be_present
      expect { other_variant_review.save! }.not_to raise_error
      expect { repeat_order_review.save! }.not_to raise_error
    end

    it 'enforces uniqueness for product-level reviews at the database boundary' do
      customer = create(:customer)
      order = create(:shipped_order, customer: customer, store: store, variants: [product.default_variant])
      review = create(:review, product: product, order: order, store: store, customer: customer)
      duplicate = review.dup

      expect { duplicate.save!(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it 'requires the variant to belong to the reviewed product' do
      other_product = create(:product, store: store)
      review = build(:review, product: product, variant: other_product.default_variant, store: store)

      expect(review).not_to be_valid
      expect(review.errors[:variant]).to be_present
    end

    it 'requires the order to contain the reviewed variant' do
      user = create(:user)
      variant = create(:reviewable_variant, product: product)
      other_variant = create(:reviewable_variant, product: product)
      order = create(:shipped_order, customer: user, store: store, variants: [other_variant])

      review = build(:review, :for_variant, product: product, variant: variant, order: order, store: store, customer: user)

      expect(review).not_to be_valid
      expect(review.errors[:order]).to be_present
    end

    it 'requires the reviewed order variant to have unreturned quantity for new reviews' do
      user = create(:user)
      variant = create(:reviewable_variant, product: product)
      order = create(:shipped_order, customer: user, store: store, variants: [variant])
      create_received_return_item(order: order, variant: variant)

      review = build(:review, :for_variant, product: product, variant: variant, order: order, store: store, customer: user)

      expect(review).not_to be_valid
      expect(review.errors[:order]).to be_present
    end

    it 'allows existing reviews to be moderated after a later return' do
      user = create(:user)
      variant = create(:reviewable_variant, product: product)
      order = create(:shipped_order, customer: user, store: store, variants: [variant])
      review = create(:review, :for_variant, product: product, variant: variant, order: order, store: store, customer: user)
      create_received_return_item(order: order, variant: variant)

      review.status = 'approved'

      expect(review).to be_valid
    end
  end

  describe '#attributed_order' do
    it 'returns the persisted order when present' do
      user = create(:user)
      order = create(:shipped_order, customer: user, store: store, variants: [product.default_variant])
      review = create(:review, product: product, store: store, customer: user, order: order)

      expect(review.attributed_order).to eq(order)
    end

    it 'infers a shipped purchase for legacy reviews missing order_id' do
      user = create(:user)
      order = create(:shipped_order, customer: user, store: store, variants: [product.default_variant])
      order.update!(completed_at: 2.days.ago)
      review = create(
        :review,
        product: product,
        store: store,
        customer: user,
        order: nil,
        variant: nil,
        created_at: 1.day.ago,
        updated_at: 1.day.ago
      )

      expect(review.attributed_order).to eq(order)
    end
  end

  describe '.with_answer' do
    it 'filters reviews by configured question option values' do
      question = create(:review_question, store: store, key: 'body_type')
      matching_option = create(:review_question_option, question: question, value: 'curvy')
      other_option = create(:review_question_option, question: question, value: 'straight')
      matching_review = create(:review, :approved, product: product, store: store)
      other_review = create(:review, :approved, product: product, store: store)

      create(:review_answer, review: matching_review, question: question, option: matching_option)
      create(:review_answer, review: other_review, question: question, option: other_option)

      expect(described_class.with_answer(question_key: 'body_type', values: ['curvy'])).to contain_exactly(matching_review)
    end

    it 'filters reviews by boolean and scale answer values' do
      recommend_question = create(:review_question, :boolean, store: store, key: 'recommend')
      fit_scale_question = create(:review_question, :scale, store: store, key: 'fit_score')
      matching_review = create(:review, :approved, product: product, store: store)
      other_review = create(:review, :approved, product: product, store: store)

      create(:review_answer, review: matching_review, question: recommend_question, option: nil, value_boolean: false)
      create(:review_answer, review: other_review, question: recommend_question, option: nil, value_boolean: true)
      create(:review_answer, review: matching_review, question: fit_scale_question, option: nil, value_number: 4)
      create(:review_answer, review: other_review, question: fit_scale_question, option: nil, value_number: 2)

      expect(described_class.with_answer(question_key: 'recommend', values: ['false'])).to contain_exactly(matching_review)
      expect(described_class.with_answer(question_key: 'fit_score', values: ['4'])).to contain_exactly(matching_review)
    end
  end

  describe 'summary recalculation' do
    it 'caches approved review counts and rating distribution' do
      create(:review, :approved, product: product, store: store, rating: 5)
      create(:review, :approved, product: product, store: store, rating: 4)
      create(:review, product: product, store: store, rating: 1)

      summary = Spree::ProductReviewSummary.find_by!(product: product, store: store)

      expect(summary.reviews_count).to eq(2)
      expect(summary.average_rating).to eq(BigDecimal('4.5'))
      expect(summary.rating_distribution).to eq(
        1 => 0,
        2 => 0,
        3 => 0,
        4 => 1,
        5 => 1
      )
    end

    it 'updates the summary when a pending review is approved' do
      review = create(:review, product: product, store: store, rating: 3)
      summary = Spree::ProductReviewSummary.find_by!(product: product, store: store)

      expect(summary.reviews_count).to eq(0)

      review.approve!

      expect(summary.reload.reviews_count).to eq(1)
      expect(summary.average_rating).to eq(BigDecimal('3.0'))
    end
  end
end

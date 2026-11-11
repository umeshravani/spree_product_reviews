require 'stringio'

FactoryBot.define do
  factory :review, class: Spree::Review do
    store { Spree::Store.default.persisted? ? Spree::Store.default : association(:store, default: true) }
    product { association(:product, store: store) }
    rating { 5 }
    title { 'Great product' }
    body { 'The fit and quality are exactly what I expected.' }
    status { 'pending' }
    verified_purchase { false }
    reviewer_name { 'Jane Customer' }

    trait :approved do
      status { 'approved' }
    end

    trait :rejected do
      status { 'rejected' }
    end

    trait :verified_purchase do
      verified_purchase { true }
    end

    trait :for_variant do
      variant { product.default_variant }
    end
  end

  factory :review_media, class: Spree::ReviewMedia do
    review
    position { 0 }
    alt { 'Customer review image' }

    after(:build) do |review_media|
      next if review_media.attachment.attached?

      review_media.attachment.attach(
        io: StringIO.new('review image'),
        filename: 'review-image.jpg',
        content_type: 'image/jpeg'
      )
    end
  end

  factory :review_question, class: Spree::ReviewQuestion do
    store { Spree::Store.default.persisted? ? Spree::Store.default : association(:store, default: true) }
    sequence(:key) { |n| "review_question_#{n}" }
    label { 'Overall fit' }
    kind { 'single_select' }
    applies_to { 'store' }
    filterable { true }
    required { false }
    active { true }
    position { 0 }

    trait :for_product do
      applies_to { 'product' }
      product { association(:product, store: store) }
    end

    trait :for_category do
      applies_to { 'category' }
      category { association(:category, store: store) }
    end

    trait :multi_select do
      kind { 'multi_select' }
    end

    trait :scale do
      kind { 'scale' }
    end

    trait :boolean do
      kind { 'boolean' }
    end

    trait :text do
      kind { 'text' }
      filterable { false }
    end
  end

  factory :review_question_option, class: Spree::ReviewQuestionOption do
    question { association(:review_question) }
    sequence(:value) { |n| "option_#{n}" }
    label { value.humanize }
    active { true }
    position { 0 }
  end

  factory :review_answer, class: Spree::ReviewAnswer do
    review
    question { association(:review_question) }
    option { association(:review_question_option, question: question) }

    trait :scale do
      question { association(:review_question, :scale) }
      option { nil }
      value_number { 4 }
    end

    trait :boolean do
      question { association(:review_question, :boolean) }
      option { nil }
      value_boolean { true }
    end

    trait :text do
      question { association(:review_question, :text) }
      option { nil }
      value_text { 'Soft fabric and easy to style.' }
    end
  end

  factory :product_review_summary, class: Spree::ProductReviewSummary do
    store { Spree::Store.default.persisted? ? Spree::Store.default : association(:store, default: true) }
    product { association(:product, store: store) }
    average_rating { 0 }
    reviews_count { 0 }
    rating_1_count { 0 }
    rating_2_count { 0 }
    rating_3_count { 0 }
    rating_4_count { 0 }
    rating_5_count { 0 }
    summary_data { {} }
  end

  factory :review_vote, class: Spree::ReviewVote do
    review
    vote { 'helpful' }
    ip_address { '127.0.0.1' }

    trait :not_helpful do
      vote { 'not_helpful' }
      ip_address { '127.0.0.2' }
    end

    trait :with_customer do
      customer
      ip_address { nil }
    end
  end

  factory :reviewable_variant, parent: :on_demand_variant do
    product { association(:product, store: Spree::Store.default) }
  end
end

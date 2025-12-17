require "faker"

FactoryBot.define do
  factory :product_review, class: Spree::ProductReview do
    product
    user

    title { Faker::Lorem.sentence(word_count: 3) }
    review { Faker::Lorem.paragraph(sentence_count: 2) }
    rating { rand(1..5) }

    product_name { Faker::Commerce.product_name }
    ip_address { Faker::Internet.ip_v4_address }
    locale { I18n.locale.to_s }

    approved { false }
    show_identifier { false }
  end
end


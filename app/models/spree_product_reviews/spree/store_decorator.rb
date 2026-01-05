module SpreeProductReviews
    module Spree
      module StoreDecorator
        def self.prepended(base)
          base.preference :review_status_default, :string, default: 'pending'
          
          base.preference :block_spam_reviews, :boolean, default: false
          base.preference :disable_review_links, :boolean, default: false
          base.preference :disable_review_emails, :boolean, default: false
          
          base.preference :spam_words, :text, default: "casino, crypto, bitcoin, lottery, loan, investment, free access, free trial, giveaway, make money"
        end
      end
    end
  end
  
  ::Spree::Store.prepend SpreeProductReviews::Spree::StoreDecorator

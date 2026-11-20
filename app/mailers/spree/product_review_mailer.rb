module Spree
  class ProductReviewMailer < Spree::BaseMailer
    # Customer submitted a review
    def review_posted_email(review)
      @review = review
      @current_store = review.store
      recipient = review.recipient_email
      return if recipient.blank?

      with_store_locale(@current_store, review.locale) do
        mail_template(
          template_assigns(review),
          to: recipient,
          store_url: @current_store.storefront_url
        )
      end
    end

    # Review was approved by moderator and published
    def review_approved_email(review)
      @review = review
      @current_store = review.store
      recipient = review.recipient_email
      return if recipient.blank?

      with_store_locale(@current_store, review.locale) do
        mail_template(
          template_assigns(review),
          to: recipient,
          store_url: @current_store.storefront_url
        )
      end
    end

    # Review rejected by moderator
    def review_rejected_email(review)
      @review = review
      @current_store = review.store
      recipient = review.recipient_email
      return if recipient.blank?

      with_store_locale(@current_store, review.locale) do
        mail_template(
          template_assigns(review),
          to: recipient,
          store_url: @current_store.storefront_url
        )
      end
    end

    # Review flagged as spam
    def review_spam_email(review)
      @review = review
      @current_store = review.store
      recipient = review.recipient_email
      return if recipient.blank?

      with_store_locale(@current_store, review.locale) do
        mail_template(
          template_assigns(review),
          to: recipient,
          store_url: @current_store.storefront_url
        )
      end
    end

    # Review deleted/removed
    def review_deleted_email(review)
      @review = review
      @current_store = review.store
      recipient = review.recipient_email
      return if recipient.blank?

      with_store_locale(@current_store, review.locale) do
        mail_template(
          template_assigns(review),
          to: recipient,
          store_url: @current_store.storefront_url
        )
      end
    end

    # Ask customer to review a purchased product
    def solicit_review_email(customer_or_email, product, store)
      @current_store = store
      recipient = customer_or_email.is_a?(String) ? customer_or_email : customer_or_email.email
      return if recipient.blank?

      product_url = "#{store.storefront_url}/products/#{product.slug}"

      with_store_locale(@current_store) do
        mail_template(
          {
            product: {
              id: product.id,
              name: product.name,
              url: product_url
            },
            review_url: product_url
          },
          to: recipient,
          store_url: @current_store.storefront_url
        )
      end
    end

    private

    def template_assigns(review)
      product = review.product
      store = review.store
      product_url = "#{store.storefront_url}/products/#{product.slug}"

      {
        review: {
          id: review.prefixed_id,
          rating: review.rating,
          title: review.title.presence || "#{review.rating} Stars",
          body: review.body.presence || '',
          author_name: review.reviewer_name.presence || 'Valued Customer',
          product_name: product.name,
          product_url: product_url,
          verified_purchase: review.verified_purchase,
          moderator_note: review.moderator_note.presence || '',
          created_at: review.created_at&.to_s
        },
        product: {
          id: product.id,
          name: product.name,
          url: product_url
        }
      }
    end
  end
end

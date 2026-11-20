module Spree
  class ProductReviewMailer < Spree::BaseMailer
    # Customer submitted a review
    def review_posted_email(review)
      @review = review
      @current_store = review.store
      deliver_review_email(
        template_key: :review_posted,
        review: review,
        default_subject: '{{ store.name }} - Thank you for reviewing {{ review.product_name }}'
      )
    end

    # Review was approved by moderator and published
    def review_approved_email(review)
      @review = review
      @current_store = review.store
      deliver_review_email(
        template_key: :review_approved,
        review: review,
        default_subject: '{{ store.name }} - Your review on {{ review.product_name }} is live!'
      )
    end

    # Review rejected by moderator
    def review_rejected_email(review)
      @review = review
      @current_store = review.store
      deliver_review_email(
        template_key: :review_rejected,
        review: review,
        default_subject: '{{ store.name }} - Update regarding your review on {{ review.product_name }}'
      )
    end

    # Review flagged as spam
    def review_spam_email(review)
      @review = review
      @current_store = review.store
      deliver_review_email(
        template_key: :review_spam,
        review: review,
        default_subject: '{{ store.name }} - Notice regarding your review'
      )
    end

    # Review deleted/removed
    def review_deleted_email(review)
      @review = review
      @current_store = review.store
      deliver_review_email(
        template_key: :review_deleted,
        review: review,
        default_subject: '{{ store.name }} - Your review on {{ review.product_name }} has been removed'
      )
    end

    # Ask customer to review a purchased product
    def solicit_review_email(customer_or_email, product, store)
      @current_store = store
      recipient = customer_or_email.is_a?(String) ? customer_or_email : customer_or_email.email
      return if recipient.blank?

      product_url = "#{store.storefront_url}/products/#{product.slug}"
      settings = Spree::ReviewSetting.for_store(store)
      custom_subject = settings[:email_solicit_review_subject].presence
      custom_body = settings[:email_solicit_review_body].presence

      assigns = {
        product: {
          id: product.id,
          name: product.name,
          url: product_url
        },
        review_url: product_url,
        store: store_assigns(store)
      }

      if custom_body.present?
        subject = render_liquid(custom_subject || '{{ store.name }} - How do you like your recent purchase?', assigns)
        html_body = render_mjml_or_html(render_liquid(custom_body, assigns), store)
        mail(
          to: recipient,
          from: store.mail_from_address.presence || 'no-reply@example.com',
          reply_to: store.customer_support_email.presence,
          subject: subject
        ) do |format|
          format.html { render html: html_body.html_safe }
          format.text { render plain: ActionController::Base.helpers.strip_tags(html_body) }
        end
      else
        with_store_locale(@current_store) do
          mail_template(
            assigns,
            to: recipient,
            store_url: @current_store.storefront_url
          )
        end
      end
    end

    private

    def deliver_review_email(template_key:, review:, default_subject:)
      recipient = review.recipient_email
      return if recipient.blank?

      store = review.store
      settings = Spree::ReviewSetting.for_store(store)
      custom_subject = settings[:"email_#{template_key}_subject"].presence
      custom_body = settings[:"email_#{template_key}_body"].presence
      assigns = template_assigns(review)

      if custom_body.present?
        subject = render_liquid(custom_subject || default_subject, assigns)
        html_body = render_mjml_or_html(render_liquid(custom_body, assigns), store)
        mail(
          to: recipient,
          from: store.mail_from_address.presence || 'no-reply@example.com',
          reply_to: store.customer_support_email.presence,
          subject: subject
        ) do |format|
          format.html { render html: html_body.html_safe }
          format.text { render plain: ActionController::Base.helpers.strip_tags(html_body) }
        end
      else
        with_store_locale(store, review.locale) do
          mail_template(
            assigns,
            to: recipient,
            store_url: store.storefront_url
          )
        end
      end
    end

    def render_liquid(str, assigns)
      return '' if str.blank?
      Liquid::Template.parse(str).render(assigns.deep_stringify_keys)
    rescue StandardError => e
      Rails.logger.warn("[ProductReviewMailer] Liquid render error: #{e.message}")
      str
    end

    def render_mjml_or_html(content, store)
      return '' if content.blank?
      if content.include?('<mj-')
        wrapped_mjml = "<mjml><mj-body>#{content}</mj-body></mjml>"
        if defined?(MRML)
          MRML.to_html(wrapped_mjml).to_s
        else
          "<div style='font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>#{content}</div>"
        end
      else
        content
      end
    rescue StandardError => e
      Rails.logger.warn("[ProductReviewMailer] MJML render error: #{e.message}")
      content
    end

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
        },
        store: store_assigns(store)
      }
    end

    def store_assigns(store)
      {
        name: store.name,
        url: store.storefront_url,
        customer_support_email: store.customer_support_email,
        mail_from_address: store.mail_from_address
      }
    end
  end
end

module Spree
  module PageBlocks
    class ProductReviewForm < Spree::PageBlock
      preference :button_text, :string, default: Spree.t("page_blocks.product_review_form.button_text_default")
      preference :placeholder, :string, default: Spree.t("page_blocks.product_review_form.placeholder_default")
      preference :button_style, :string, default: "primary"
      validates :preferred_button_style, inclusion: { in: %w[primary secondary] }
      def icon_name
        "forms"
      end
    end
  end
end
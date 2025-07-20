module Spree
  module PageSections
    class AddAReview < Spree::PageSection
      TOP_PADDING_DEFAULT = 30
      BOTTOM_PADDING_DEFAULT = 30
      TOP_BORDER_WIDTH_DEFAULT = 0
      BOTTOM_BORDER_WIDTH_DEFAULT = 0

      preference :allow_unverified_purchase_reviews, :boolean, default: false

      preference :heading_no_review_yet, :string, default: Spree.t("add_a_review_heading")
      preference :heading_pending_review, :string, default: Spree.t("thanks_for_review_heading")
      preference :heading_review_approved, :string, default: Spree.t("thanks_for_review_heading")

      preference :heading_size, :string, default: "large"
      preference :heading_alignment, :string, default: "left"
      preference :display, :string, default: "stacked"

      validates :preferred_heading_size, inclusion: { in: %w[small medium large] }
      validates :preferred_heading_alignment, inclusion: { in: %w[left center right] }
      validates :preferred_display, inclusion: { in: %w[stacked inline] }

      def self.role
        "content"
      end

      def display_name
        "Add a Review"
      end

      def blocks_available?
        true
      end

      def default_blocks
        [
          Spree::PageBlocks::Text.new(
            text: Spree.t(:add_a_review_text),
            preferred_text_alignment: "left",
            preferred_bottom_padding: 30,
            preferred_width_desktop: "75"
          ),
          Spree::PageBlocks::ProductReviewForm.new,
        ]
      end

      def available_blocks_to_add
        [
          Spree::PageBlocks::Heading,
          Spree::PageBlocks::Text,
          Spree::PageBlocks::Image,
          Spree::PageBlocks::ProductReviewForm,
        ]
      end

      def icon_name
        "writing"
      end

      def links_available?
        false
      end
    end
  end
end


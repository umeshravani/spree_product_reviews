module Spree
  module PageSections
    class AddAReview < Spree::PageSection
      TOP_PADDING_DEFAULT = 30
      BOTTOM_PADDING_DEFAULT = 30
      TOP_BORDER_WIDTH_DEFAULT = 0
      BOTTOM_BORDER_WIDTH_DEFAULT = 0

      preference :allow_unverified_purchase_reviews, :boolean, default: true

      preference :heading_no_review_yet, :string, default: Spree.t("add_a_review_heading")
      preference :heading_pending_review, :string, default: Spree.t("thanks_for_review_heading_pending")
      preference :heading_review_approved, :string, default: Spree.t("thanks_for_review_heading")

      preference :heading_size, :string, default: "large"
      preference :heading_alignment, :string, default: "center"
      preference :display, :string, default: "stacked"

      validates :preferred_heading_size, inclusion: { in: %w[small medium large] }
      validates :preferred_heading_alignment, inclusion: { in: %w[left center right] }
      validates :preferred_display, inclusion: { in: %w[stacked inline] }
      #Review Controls (Still not Implemented, coming soon)
      preference :rating_color, :string, default: '#FFA500'
      preference :title_font_size, :integer, default: 18

      preference :review_star_color, :string, default: '#FFA500'
      preference :review_font_size, :integer, default: 14

      preference :verified_badge_color, :string, default: '#00a63e'

      preference :max_images_upload, :integer, default: 5
      preference :max_image_size_mb, :integer, default: 5

      preference :thumbnail_size, :integer, default: 72

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
            preferred_text_alignment: "center",
            preferred_container_alignment: "center",
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
        "device-ipad-horizontal-star"
      end

      def links_available?
        false
      end
    end
  end
end

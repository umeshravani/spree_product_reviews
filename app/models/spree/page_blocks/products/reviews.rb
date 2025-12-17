module Spree
  module PageBlocks
    module Products
      class Reviews < Spree::PageBlock

        preference :star_color, :string, default: '#FFA500'
        preference :display_numbers, :boolean, default: true
        preference :star_font_size, :integer, default: 16

        def self.block_name
          "Reviews & Ratings"
        end

        def self.display_name
          "Reviews"
        end

        def editor_name
          "Reviews"
        end

        def icon_name
          "input-spark"
        end

        def render(view_context, locals = {})
          view_context.render(
            partial: "spree/page_blocks/products/reviews/reviews",
            locals: locals.merge(block: self)
          )
        rescue ActionView::MissingTemplate
          ""
        end
      end
    end
  end
end

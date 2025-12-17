module Spree
  module PageSections
    module ProductDetailsDecorator
      def available_blocks_to_add
        super + [Spree::PageBlocks::Products::Reviews]
      end
    end
  end
end
Spree::PageSections::ProductDetails.prepend(Spree::PageSections::ProductDetailsDecorator)

module Spree
  module PageSections
    module ProductDetailsDecorator
      def available_blocks_to_add
        super + [Spree::PageBlocks::Products::Reviews]
      end
    end
  end
end

# Sits OUTSIDE the module definition
if defined?(Spree::PageSections::ProductDetails)
  Spree::PageSections::ProductDetails.prepend(Spree::PageSections::ProductDetailsDecorator)
end

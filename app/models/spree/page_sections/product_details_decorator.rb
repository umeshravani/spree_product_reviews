module Spree
  module PageSections
    module ProductDetailsDecorator
      def available_blocks_to_add
        super + [Spree::PageBlocks::Products::Reviews]
      end
    end
  end
end

# Guarded for Spree 5 backward compatibility; in Spree 6 PageSections is not present
if defined?(Spree::PageSections::ProductDetails) && !Spree::PageSections::ProductDetails.ancestors.include?(Spree::PageSections::ProductDetailsDecorator)
  Spree::PageSections::ProductDetails.prepend(Spree::PageSections::ProductDetailsDecorator)
end

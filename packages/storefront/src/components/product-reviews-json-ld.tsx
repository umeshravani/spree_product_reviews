import React from 'react';
import type { ProductReview, ReviewsMeta } from '../types';
import { generateProductReviewsJsonLd, type ProductMetadata } from '../seo';

export interface ProductReviewsJsonLdProps {
  product: ProductMetadata;
  reviews?: ProductReview[];
  meta: ReviewsMeta;
}

/**
 * Server Component for rendering Google Search Central compliant JSON-LD structured data.
 * Safe for Next.js App Router and Pages Router.
 */
export function ProductReviewsJsonLd({
  product,
  reviews = [],
  meta,
}: ProductReviewsJsonLdProps) {
  const schema = generateProductReviewsJsonLd({ product, reviews, meta });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}


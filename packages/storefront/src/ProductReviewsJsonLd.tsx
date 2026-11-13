import type { ReviewItem, ReviewStoreSettings, ReviewSummary } from "./types.js";

export interface ProductOfferSchemaInput {
  price: string | number;
  priceCurrency: string;
  availability?: string;
  url?: string;
  itemCondition?: string;
  priceValidUntil?: string;
  shippingDetails?: Record<string, unknown>;
}

export interface ProductReviewsJsonLdProps {
  product: {
    name: string;
    description?: string;
    image?: string | string[];
    sku?: string;
    gtin?: string;
    mpn?: string;
    brand?: string;
    url: string;
    offers?: ProductOfferSchemaInput | ProductOfferSchemaInput[];
  };
  summary?: Pick<ReviewSummary, "average_rating" | "reviews_count"> | null;
  reviews?: ReviewItem[];
  settings?: Partial<ReviewStoreSettings> | null;
}

export function buildProductReviewsJsonLdSchema({
  product,
  summary,
  reviews = [],
  settings,
}: ProductReviewsJsonLdProps): Record<string, unknown> {
  const count = summary?.reviews_count ?? 0;
  const average = Number(summary?.average_rating ?? 0);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${product.url}#product`,
    name: product.name,
    url: product.url,
  };

  if (product.description) data.description = product.description;
  if (product.sku) data.sku = product.sku;
  if (product.gtin) data.gtin = product.gtin;
  if (product.mpn) data.mpn = product.mpn;

  if (product.image) {
    const images = Array.isArray(product.image)
      ? product.image.filter(Boolean)
      : [product.image].filter(Boolean);
    if (images.length > 0) {
      data.image = images.length === 1 ? images[0] : images;
    }
  }

  if (product.brand) {
    data.brand = {
      "@type": "Brand",
      name: product.brand,
    };
  }

  const includeOffers = settings?.schema_include_offers !== false;
  if (includeOffers && product.offers) {
    const condition =
      settings?.schema_item_condition || "NewCondition";
    const fullConditionUrl = condition.startsWith("http")
      ? condition
      : `https://schema.org/${condition}`;

    const normalizeOffer = (offer: ProductOfferSchemaInput) => ({
      "@type": "Offer",
      url: offer.url || product.url,
      priceCurrency: offer.priceCurrency,
      price: String(offer.price),
      availability: offer.availability || "https://schema.org/InStock",
      itemCondition: offer.itemCondition || fullConditionUrl,
      ...(offer.priceValidUntil
        ? { priceValidUntil: offer.priceValidUntil }
        : {}),
      ...(settings?.schema_show_shipping !== false
        ? {
            shippingDetails: offer.shippingDetails || {
              "@type": "OfferShippingDetails",
              shippingRate: {
                "@type": "MonetaryAmount",
                value: "0.00",
                currency: offer.priceCurrency,
              },
              shippingDestination: {
                "@type": "DefinedRegion",
                addressCountry: "IN",
              },
            },
          }
        : {}),
    });

    data.offers = Array.isArray(product.offers)
      ? product.offers.map(normalizeOffer)
      : normalizeOffer(product.offers);
  }

  const includeAggregate =
    settings?.schema_include_aggregate_rating !== false;
  if (includeAggregate && count > 0 && average > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(average.toFixed(2)),
      reviewCount: count,
      ratingCount: count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const includeReviews = settings?.schema_include_reviews !== false;
  if (includeReviews) {
    const maxReviews = settings?.schema_max_reviews_count || 10;
    const publishedReviews = reviews
      .filter((r) => !r.status || r.status === "approved")
      .slice(0, maxReviews);

    if (publishedReviews.length > 0) {
      data.review = publishedReviews.map((r) => ({
        "@type": "Review",
        ...(r.title ? { name: r.title } : {}),
        ...(r.body ? { reviewBody: r.body } : {}),
        datePublished: r.created_at,
        author: {
          "@type": "Person",
          name: r.reviewer_display_name || "Verified Customer",
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: r.rating,
          bestRating: 5,
          worstRating: 1,
        },
      }));
    }
  }

  return data;
}

export function ProductReviewsJsonLd(props: ProductReviewsJsonLdProps) {
  if (props.settings?.schema_markup_enabled === false) {
    return null;
  }

  const data = buildProductReviewsJsonLdSchema(props);
  const serialized = JSON.stringify(data).replaceAll("<", "\\u003c");

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Safe JSON-LD serialization with '<' escaped
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  );
}

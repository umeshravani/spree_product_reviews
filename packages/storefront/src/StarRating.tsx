"use client";

import { useState } from "react";

export interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "xs" | "sm" | "md" | "lg";
  interactive?: boolean;
  decorative?: boolean;
  color?: string;
  onChange?: (rating: number) => void;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<StarRatingProps["size"]>, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export function StarRating({
  rating,
  maxRating = 5,
  size = "sm",
  interactive = false,
  decorative = false,
  color = "#FBBF24",
  onChange,
  className = "",
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = hovered ?? rating;
  const sizeClass = SIZE_CLASSES[size];

  const stars = Array.from({ length: maxRating }, (_, idx) => {
    const starNum = idx + 1;
    const filled = starNum <= Math.round(displayValue);
    const starSvg = (
      <svg
        className={`${sizeClass} shrink-0 transition-transform ${
          filled
            ? ""
            : "fill-gray-200 text-gray-200 dark:fill-neutral-700 dark:text-neutral-700"
        }`}
        style={filled ? { color, fill: color } : undefined}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z" />
      </svg>
    );

    if (!interactive) {
      return <span key={starNum}>{starSvg}</span>;
    }

    return (
      <button
        key={starNum}
        type="button"
        aria-pressed={rating === starNum}
        aria-label={`${starNum} ${starNum === 1 ? "star" : "stars"}`}
        onClick={() => onChange?.(starNum)}
        onMouseEnter={() => setHovered(starNum)}
        className="p-0.5 rounded hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
      >
        {starSvg}
      </button>
    );
  });

  if (interactive) {
    return (
      <fieldset
        className={`inline-flex items-center gap-0.5 border-0 p-0 m-0 ${className}`}
        onMouseLeave={() => setHovered(null)}
      >
        <legend className="sr-only">Select star rating</legend>
        {stars}
      </fieldset>
    );
  }

  if (decorative) {
    return (
      <div
        className={`inline-flex items-center gap-0.5 ${className}`}
        aria-hidden="true"
      >
        {stars}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${rating} out of ${maxRating} stars`}
    >
      {stars}
    </div>
  );
}


'use client'

import { Star } from 'lucide-react'
import React from 'react'

export interface ProductRatingHeaderProps {
  rating?: number
  reviewCount?: number
  starColor?: string
  format?: string
  reviewsLabel?: string
  targetId?: string
  className?: string
  onClick?: () => void
}

export function ProductRatingHeader({
  rating = 0,
  reviewCount = 0,
  starColor = '#000000',
  format,
  reviewsLabel = 'reviews',
  targetId = 'reviews',
  className = '',
  onClick,
}: ProductRatingHeaderProps) {
  const roundedRating = Number(rating || 0).toFixed(1)
  const formattedCount = reviewCount.toLocaleString()

  const handleScroll = (e: React.MouseEvent) => {
    e.preventDefault()
    if (onClick) {
      onClick()
      return
    }

    if (typeof document !== 'undefined' && targetId) {
      const element = document.getElementById(targetId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  // Display label: e.g. "1,500+ reviews" or "{count} reviews"
  const countDisplay = reviewCount > 1000 ? `${(Math.floor(reviewCount / 100) * 100).toLocaleString()}+` : formattedCount

  return (
    <div className={`inline-flex items-center gap-2 text-sm font-medium ${className}`}>
      {/* 5 Filled / Part-Filled Star Icons matching media_1793875200341_d4ff7856.png */}
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => {
          const fillRatio = Math.max(0, Math.min(1, rating - (star - 1)))
          const isFull = fillRatio >= 0.75
          const isHalf = fillRatio >= 0.25 && fillRatio < 0.75

          return (
            <span key={star} className="relative inline-block w-4 h-4">
              <Star
                className="w-4 h-4"
                style={{
                  color: starColor,
                  fill: isFull ? starColor : isHalf ? 'none' : 'none',
                }}
                strokeWidth={1.75}
              />
              {isHalf && (
                <span className="absolute inset-0 overflow-hidden w-1/2">
                  <Star
                    className="w-4 h-4"
                    style={{
                      color: starColor,
                      fill: starColor,
                    }}
                    strokeWidth={1.75}
                  />
                </span>
              )}
            </span>
          )
        })}
      </div>

      {/* Score e.g. 4.9/5 */}
      <span className="text-neutral-900 dark:text-neutral-100 font-semibold text-sm">
        {roundedRating}/5
      </span>

      {/* Clickable Reviews Link with Smooth Scroll */}
      <a
        href={`#${targetId}`}
        onClick={handleScroll}
        className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline underline-offset-2 transition-colors cursor-pointer text-sm font-normal"
        title="View customer reviews"
      >
        {reviewCount > 0 ? `${countDisplay} ${reviewsLabel}` : `0 ${reviewsLabel}`}
      </a>
    </div>
  )
}

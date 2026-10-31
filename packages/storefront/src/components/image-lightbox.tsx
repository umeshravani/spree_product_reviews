'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReviewImage } from '../types'

export interface ImageLightboxProps {
  images: ReviewImage[]
  initialIndex?: number
  open?: boolean
  isOpen?: boolean
  onClose: () => void
}

export function ImageLightbox({
  images,
  initialIndex = 0,
  open,
  isOpen,
  onClose,
}: ImageLightboxProps) {
  const isVisible = open ?? isOpen ?? false
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  // Keyboard navigation & escape listener
  useEffect(() => {
    if (!isVisible) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % images.length)
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, images.length, onClose])

  if (!isVisible || !images || images.length === 0) return null

  const currentImage = images[currentIndex] || images[0]

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
  }

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery lightbox"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close image lightbox"
          className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Current Image */}
        <div className="overflow-hidden rounded-lg shadow-2xl bg-black max-h-[80vh]">
          <img
            src={currentImage.url}
            alt={currentImage.filename || `Review photo ${currentIndex + 1}`}
            className="max-h-[80vh] max-w-full object-contain"
          />
        </div>

        {/* Counter and Thumbnails Navigation */}
        {images.length > 1 && (
          <div className="mt-3 flex items-center justify-between w-full text-white text-xs px-2">
            <span className="tabular-nums">
              {currentIndex + 1} of {images.length}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous image"
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next image"
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

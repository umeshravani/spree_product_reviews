# frozen_string_literal: true

require 'tempfile'

module SpreeProductReviews
  class ImageSanitizer
    class SanitizationError < StandardError; end
    class ServiceUnavailableError < SanitizationError; end
    class CorruptedFileError < SanitizationError; end
    class UnsupportedFormatError < SanitizationError; end
    class OversizedUploadError < SanitizationError; end

    ALLOWED_IMAGE_MIME_TYPES = %w[image/jpeg image/jpg image/png image/webp].freeze
    ALLOWED_VIDEO_MIME_TYPES = %w[video/mp4 video/webm video/quicktime video/x-matroska].freeze
    ALLOWED_MIME_TYPES = (ALLOWED_IMAGE_MIME_TYPES + ALLOWED_VIDEO_MIME_TYPES).freeze

    def self.video?(file)
      ct = file.respond_to?(:content_type) ? file.content_type.to_s.downcase : ''
      ALLOWED_VIDEO_MIME_TYPES.include?(ct)
    end

    def self.sanitize!(file, max_mb: nil)
      new(file, max_mb: max_mb).sanitize!
    end

    def self.sanitize_batch!(files, max_mb: nil)
      return [] if files.blank?

      Array(files).map do |file|
        sanitize!(file, max_mb: max_mb)
        file
      end
    end

    def initialize(file, max_mb: nil)
      @file = file
      @is_video = self.class.video?(file)
      @max_mb = if @is_video
                  50
                else
                  max_mb || begin
                    SpreeProductReviews.config.max_image_size_mb
                  rescue StandardError
                    10
                  end
                end
      @max_mb = (@is_video ? 50 : 10) if @max_mb.nil? || @max_mb <= 0
    end

    def sanitize!
      validate_presence_and_structure!
      validate_size!
      validate_mime_and_magic_bytes!
      return file if @is_video # Videos are size and magic-byte verified; EXIF stripping applies to raster images

      ensure_processor_available!
      process_and_strip_metadata!
    end

    private

    attr_reader :file, :max_mb

    def validate_presence_and_structure!
      raise CorruptedFileError, 'Uploaded image file is empty or missing' if file.blank?

      tempfile = file.respond_to?(:tempfile) ? file.tempfile : (file.respond_to?(:path) ? file : nil)
      path = tempfile.respond_to?(:path) ? tempfile.path : tempfile.to_s
      raise CorruptedFileError, 'Uploaded image file stream is invalid' unless tempfile && File.exist?(path)
    end

    def validate_size!
      max_bytes = max_mb * 1024 * 1024
      actual_size = if file.respond_to?(:size) && file.size.to_i > 0
                      file.size.to_i
                    else
                      path = file.respond_to?(:tempfile) ? file.tempfile.path : file.path
                      File.size(path)
                    end

      if actual_size > max_bytes
        raise OversizedUploadError, "Image exceeds maximum allowed size of #{max_mb}MB"
      end
    end

    def validate_mime_and_magic_bytes!
      content_type = file.respond_to?(:content_type) ? file.content_type.to_s.downcase : ''
      unless ALLOWED_MIME_TYPES.include?(content_type)
        raise UnsupportedFormatError, "Unsupported image format (#{content_type.presence || 'unknown'}). Allowed formats: JPEG, PNG, WebP, MP4, MOV, WebM"
      end

      temp_path = file.respond_to?(:tempfile) ? file.tempfile.path : file.path
      header = File.binread(temp_path, 32).to_s

      if @is_video
        is_valid_mp4 = header[4..7] == "ftyp".b || header[4..7] == "moov".b || header.include?("ftyp".b)
        is_valid_webm = header.start_with?("\x1A\x45\xDF\xA3".b)
        unless is_valid_mp4 || is_valid_webm
          raise CorruptedFileError, 'Video file header is malformed or corrupted'
        end
      else
        is_valid_jpeg = header.start_with?("\xFF\xD8\xFF".b)
        is_valid_png = header.start_with?("\x89PNG\r\n\x1a\n".b)
        is_valid_webp = header.start_with?("RIFF".b) && header[8..11] == "WEBP".b

        unless is_valid_jpeg || is_valid_png || is_valid_webp
          raise CorruptedFileError, 'Image file header is malformed or corrupted'
        end
      end
    end

    def ensure_processor_available!
      # Fail-closed: libvips / ImageProcessing::Vips must be available
      processor = if defined?(::ImageProcessing::Vips)
                    ::ImageProcessing::Vips
                  else
                    nil
                  end

      unless processor
        raise ServiceUnavailableError, 'Image sanitization service is unavailable. Photo uploads are temporarily disabled for customer privacy.'
      end
    end

    def process_and_strip_metadata!
      temp_path = file.respond_to?(:tempfile) ? file.tempfile.path : file.path

      begin
        sanitized_tempfile = ::ImageProcessing::Vips
                               .source(temp_path)
                               .saver(strip: true)
                               .call

        if exif_present?(sanitized_tempfile.path)
          raise SanitizationError, 'Sanitization verification failed: EXIF metadata could not be fully removed'
        end

        if file.respond_to?(:tempfile=)
          file.tempfile = sanitized_tempfile
        end

        sanitized_tempfile
      rescue SanitizationError
        raise
      rescue StandardError => e
        # Fail-closed: Never log binary content or metadata. Log only the generic exception class.
        Rails.logger.warn("[SpreeProductReviews::ImageSanitizer] Image processing failure: #{e.class.name}") if defined?(Rails)
        raise CorruptedFileError, 'Image could not be safely processed or verified for privacy'
      end
    end

    def exif_present?(path)
      header = File.binread(path, 1024).to_s
      return false unless header.start_with?("\xFF\xD8".b)

      header.include?("\xFF\xE1".b) && header.include?("Exif\x00\x00".b)
    end
  end
end

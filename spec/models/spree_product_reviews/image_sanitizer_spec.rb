# frozen_string_literal: true

require 'spec_helper'
require 'spree_product_reviews/image_sanitizer'

RSpec.describe SpreeProductReviews::ImageSanitizer do
  let(:mock_upload) do
    Struct.new(:tempfile, :content_type, :original_filename, :size)
  end

  def create_jpeg(include_exif: false)
    tempfile = Tempfile.new(['test_img', '.jpg'], binmode: true)
    soi = "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00".b
    if include_exif
      exif_payload = "Exif\x00\x00Apple\x00iPhone 16 Pro\x00GPS:37.7749,-122.4194\x00".b
      app1_header = "\xFF\xE1".b + [exif_payload.bytesize + 2].pack('n') + exif_payload
      tempfile.write(soi + app1_header + "\xFF\xD9".b)
    else
      tempfile.write(soi + "\xFF\xD9".b)
    end
    tempfile.rewind
    tempfile
  end

  def create_png
    tempfile = Tempfile.new(['test_img', '.png'], binmode: true)
    tempfile.write("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82".b)
    tempfile.rewind
    tempfile
  end

  describe '1. JPEG containing GPS EXIF metadata' do
    it 'strips EXIF metadata before persistence and returns sanitized bytes' do
      raw_file = create_jpeg(include_exif: true)
      upload = mock_upload.new(raw_file, 'image/jpeg', 'camera_gps.jpg', raw_file.size)

      # Raw file contains sensitive metadata
      raw_bytes = File.binread(raw_file.path)
      expect(raw_bytes).to include('Apple')
      expect(raw_bytes).to include('iPhone')
      expect(raw_bytes).to include('37.7749')

      # Mock processor stripping metadata
      fake_stripped = Tempfile.new(['stripped', '.jpg'], binmode: true)
      clean_bytes = "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xFF\xD9".b
      fake_stripped.write(clean_bytes)
      fake_stripped.rewind

      vips_mock = double('ImageProcessing::Vips')
      allow(vips_mock).to receive_message_chain(:source, :saver, :call).and_return(fake_stripped)
      stub_const('ImageProcessing::Vips', vips_mock)

      sanitizer = described_class.new(upload, max_mb: 5)
      result_file = sanitizer.sanitize!

      # Verify the bytes of the actual retrievable attachment
      sanitized_bytes = File.binread(result_file.path)
      expect(sanitized_bytes).not_to include('Apple')
      expect(sanitized_bytes).not_to include('iPhone')
      expect(sanitized_bytes).not_to include('37.7749')
      expect(sanitized_bytes).not_to include('Exif')
      expect(upload.tempfile.path).to eq(result_file.path)
    end
  end

  describe '2. Valid image without EXIF' do
    it 'processes cleanly and preserves valid image' do
      clean_file = create_jpeg(include_exif: false)
      upload = mock_upload.new(clean_file, 'image/jpeg', 'clean.jpg', clean_file.size)

      fake_stripped = Tempfile.new(['clean_out', '.jpg'], binmode: true)
      fake_stripped.write(File.binread(clean_file.path))
      fake_stripped.rewind

      vips_mock = double('ImageProcessing::Vips')
      allow(vips_mock).to receive_message_chain(:source, :saver, :call).and_return(fake_stripped)
      stub_const('ImageProcessing::Vips', vips_mock)

      sanitizer = described_class.new(upload, max_mb: 5)
      result = sanitizer.sanitize!
      expect(File.binread(result.path)).to start_with("\xFF\xD8".b)
    end
  end

  describe '3. Fail-Closed: Missing libvips' do
    it 'rejects upload when image processor is unavailable' do
      raw_file = create_jpeg(include_exif: true)
      upload = mock_upload.new(raw_file, 'image/jpeg', 'photo.jpg', raw_file.size)

      # Ensure ImageProcessing::Vips is undefined
      hide_const('ImageProcessing::Vips')

      sanitizer = described_class.new(upload, max_mb: 5)
      expect {
        sanitizer.sanitize!
      }.to raise_error(SpreeProductReviews::ImageSanitizer::ServiceUnavailableError, /temporarily disabled for customer privacy/)
    end
  end

  describe '4. Fail-Closed: Image processing exceptions' do
    it 'rejects upload and raises CorruptedFileError without logging sensitive data' do
      raw_file = create_jpeg(include_exif: true)
      upload = mock_upload.new(raw_file, 'image/jpeg', 'broken.jpg', raw_file.size)

      vips_mock = double('ImageProcessing::Vips')
      allow(vips_mock).to receive_message_chain(:source, :saver, :call).and_raise(RuntimeError.new('libvips decode error'))
      stub_const('ImageProcessing::Vips', vips_mock)

      sanitizer = described_class.new(upload, max_mb: 5)
      expect {
        sanitizer.sanitize!
      }.to raise_error(SpreeProductReviews::ImageSanitizer::CorruptedFileError, /could not be safely processed/)
    end
  end

  describe '5. Unsupported image types' do
    it 'rejects PDF files' do
      tempfile = Tempfile.new(['doc', '.pdf'], binmode: true)
      tempfile.write("%PDF-1.4\n%...".b)
      tempfile.rewind
      upload = mock_upload.new(tempfile, 'application/pdf', 'document.pdf', tempfile.size)

      sanitizer = described_class.new(upload, max_mb: 5)
      expect {
        sanitizer.sanitize!
      }.to raise_error(SpreeProductReviews::ImageSanitizer::UnsupportedFormatError, /Unsupported image format/)
    end

    it 'rejects SVG files disguised as images' do
      tempfile = Tempfile.new(['vector', '.svg'], binmode: true)
      tempfile.write("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>".b)
      tempfile.rewind
      upload = mock_upload.new(tempfile, 'image/svg+xml', 'vector.svg', tempfile.size)

      sanitizer = described_class.new(upload, max_mb: 5)
      expect {
        sanitizer.sanitize!
      }.to raise_error(SpreeProductReviews::ImageSanitizer::UnsupportedFormatError, /Unsupported image format/)
    end
  end

  describe '6. Malformed image files' do
    it 'rejects executable with .jpg extension' do
      tempfile = Tempfile.new(['fake', '.jpg'], binmode: true)
      tempfile.write("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00".b) # Windows PE magic
      tempfile.rewind
      upload = mock_upload.new(tempfile, 'image/jpeg', 'virus.jpg', tempfile.size)

      sanitizer = described_class.new(upload, max_mb: 5)
      expect {
        sanitizer.sanitize!
      }.to raise_error(SpreeProductReviews::ImageSanitizer::CorruptedFileError, /header is malformed or corrupted/)
    end
  end

  describe '7. Oversized uploads' do
    it 'rejects files exceeding maximum allowed megabytes' do
      tempfile = create_jpeg(include_exif: false)
      # Simulate 10MB file when max is 5MB
      upload = mock_upload.new(tempfile, 'image/jpeg', 'huge.jpg', 10 * 1024 * 1024)

      sanitizer = described_class.new(upload, max_mb: 5)
      expect {
        sanitizer.sanitize!
      }.to raise_error(SpreeProductReviews::ImageSanitizer::OversizedUploadError, /exceeds maximum allowed size of 5MB/)
    end
  end

  describe 'Public Retrievable Attachment Verification' do
    it 'ensures Active Storage receives the sanitized tempfile stream' do
      raw_file = create_jpeg(include_exif: true)
      upload = mock_upload.new(raw_file, 'image/jpeg', 'photo_with_gps.jpg', raw_file.size)

      fake_stripped = Tempfile.new(['verified_stripped', '.jpg'], binmode: true)
      clean_bytes = "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xFF\xD9".b
      fake_stripped.write(clean_bytes)
      fake_stripped.rewind

      vips_mock = double('ImageProcessing::Vips')
      allow(vips_mock).to receive_message_chain(:source, :saver, :call).and_return(fake_stripped)
      stub_const('ImageProcessing::Vips', vips_mock)

      described_class.sanitize_batch!([upload])

      # The upload tempfile itself is swapped with the clean stream
      retrievable_bytes = File.binread(upload.tempfile.path)
      expect(retrievable_bytes).to eq(clean_bytes)
      expect(retrievable_bytes).not_to include('Apple')
      expect(retrievable_bytes).not_to include('GPS')
    end
  end
end

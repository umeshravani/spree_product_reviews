require 'spec_helper'

RSpec.describe Spree::ReviewMedia, type: :model do
  describe 'validations' do
    it 'is valid with an attached image' do
      expect(build(:review_media)).to be_valid
    end

    it 'rejects non-image attachments' do
      review_media = build(:review_media)
      review_media.attachment.detach
      review_media.attachment.attach(
        io: StringIO.new('not an image'),
        filename: 'review.txt',
        content_type: 'text/plain'
      )

      expect(review_media).not_to be_valid
      expect(review_media.errors[:attachment]).to be_present
    end

    it 'enforces the configured image count limit' do
      previous_limit = SpreeProductReviews::Config[:max_images_per_review]
      SpreeProductReviews::Config[:max_images_per_review] = 1
      review = create(:review)

      create(:review_media, review: review)
      extra_media = build(:review_media, review: review)

      expect(extra_media).not_to be_valid
      expect(extra_media.errors[:review]).to be_present
    ensure
      SpreeProductReviews::Config[:max_images_per_review] = previous_limit
    end
  end
end

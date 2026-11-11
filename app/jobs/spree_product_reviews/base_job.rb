module SpreeProductReviews
  class BaseJob < ActiveJob::Base
    queue_as SpreeProductReviews.queue
  end
end

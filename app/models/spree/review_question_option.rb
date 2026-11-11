module Spree
  class ReviewQuestionOption < Spree.base_class
    has_prefix_id :revopt

    attribute :active, :boolean, default: true
    attribute :position, :integer, default: 0

    self.whitelisted_ransackable_attributes = %w[
      review_question_id value label active position created_at updated_at
    ]
    self.whitelisted_ransackable_associations = %w[question answers]

    belongs_to :question, class_name: 'Spree::ReviewQuestion', foreign_key: :review_question_id,
             inverse_of: :options
    has_many :answers, class_name: 'Spree::ReviewAnswer', foreign_key: :review_question_option_id,
             dependent: :restrict_with_error, inverse_of: :option

    before_validation :normalize_value

    validates :question, :value, :label, presence: true
    validates :value, uniqueness: { scope: :review_question_id }
    validates :active, inclusion: { in: [true, false] }
    validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

    scope :active, -> { where(active: true) }
    scope :ordered, -> { order(:position, :id) }

    private

    def normalize_value
      self.value = label if value.blank? && label.present?
      self.value = value.to_s.parameterize(separator: '_') if value.present?
    end
  end
end

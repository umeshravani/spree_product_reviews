module Spree
  class ReviewAnswer < Spree.base_class
    has_prefix_id :revans

    belongs_to :review, class_name: 'Spree::Review', inverse_of: :answers, touch: true
    belongs_to :question, class_name: 'Spree::ReviewQuestion', foreign_key: :review_question_id,
             inverse_of: :answers
    belongs_to :option, class_name: 'Spree::ReviewQuestionOption',
             foreign_key: :review_question_option_id, optional: true, inverse_of: :answers

    validates :review, :question, presence: true
    validate :option_belongs_to_question
    validate :value_matches_question_kind

    scope :filterable, -> { joins(:question).merge(Spree::ReviewQuestion.filterable) }

    def value
      case question&.kind
      when 'single_select', 'multi_select'
        option&.value
      when 'scale'
        value_number
      when 'boolean'
        value_boolean
      else
        value_text
      end
    end

    private

    def option_belongs_to_question
      return if option.blank? || question.blank?
      return if option.review_question_id == question.id

      errors.add(:option, :invalid)
    end

    def value_matches_question_kind
      return if question.blank?

      case question.kind
      when 'single_select', 'multi_select'
        errors.add(:option, :blank) if option.blank?
      when 'scale'
        errors.add(:value_number, :blank) if value_number.blank?
      when 'boolean'
        errors.add(:value_boolean, :blank) if value_boolean.nil?
      when 'text'
        errors.add(:value_text, :blank) if value_text.blank?
      end
    end
  end
end

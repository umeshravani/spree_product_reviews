require 'spec_helper'

RSpec.describe Spree::ReviewAnswer, type: :model do
  describe 'validations' do
    it 'is valid with an option from the same question' do
      question = create(:review_question)
      option = create(:review_question_option, question: question)
      answer = build(:review_answer, question: question, option: option)

      expect(answer).to be_valid
    end

    it 'rejects options from another question' do
      question = create(:review_question)
      other_option = create(:review_question_option)
      answer = build(:review_answer, question: question, option: other_option)

      expect(answer).not_to be_valid
      expect(answer.errors[:option]).to be_present
    end

    it 'requires text answers for text questions' do
      answer = build(:review_answer, :text, value_text: nil)

      expect(answer).not_to be_valid
      expect(answer.errors[:value_text]).to be_present
    end
  end

  describe '#value' do
    it 'returns the stored answer value for the question kind' do
      answer = build(:review_answer, :boolean, value_boolean: false)

      expect(answer.value).to be(false)
    end
  end
end

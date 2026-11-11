require 'spec_helper'

RSpec.describe Spree::ReviewQuestionOption, type: :model do
  describe 'validations' do
    it 'generates an underscore value from the label when value is blank' do
      option = build(:review_question_option, label: 'True to size', value: nil)

      option.validate

      expect(option.value).to eq('true_to_size')
    end

    it 'normalizes manually entered values to lowercase underscores' do
      option = build(:review_question_option, label: 'True to size', value: 'True To Size')

      option.validate

      expect(option.value).to eq('true_to_size')
    end
  end
end

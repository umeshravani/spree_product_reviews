require "spec_helper"

RSpec.configure do |config|
  if ENV["CI"]
    config.before(:example, :focus) do |example|
      raise "Focused spec found at #{example.location}. Please remove the `:focus` tag to run all specs."
    end
  else
    config.filter_run_when_matching :focus
  end
end


Spree.permissions.register_scope(
  :reviews,
  group: :catalog,
  resources: -> {
    [
      Spree::Review,
      Spree::ReviewQuestion,
      Spree::ReviewQuestionOption,
      Spree::ReviewSetting,
      Spree::ReviewModerationAudit,
      Spree::ReviewReport
    ]
  }
)

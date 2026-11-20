import { PageHeader, SettingsSection, usePermissions, useStore } from '@spree/dashboard-core'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  Switch,
  Textarea,
} from '@spree/dashboard-ui'
import {
  FileTextIcon,
  GiftIcon,
  ImageIcon,
  MailIcon,
  PaletteIcon,
  PencilIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
} from '@spree/dashboard-ui/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { reviewsClient } from './client'
import { StarDisplay, VerifiedCheckIcon } from './components'
import type { RouteProps } from './shared'
import { ErrorMessage, NativeSelect } from './shared'
import type { ReviewSettings } from './types'

type SettingsTab = 'general' | 'settings' | 'customisation' | 'marketing'

export function ReviewSettingsPage({ storeId }: RouteProps) {
  const { permissions } = usePermissions()
  const canEdit = permissions.can('update', 'review')
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [draft, setDraft] = useState<ReviewSettings | null>(null)
  const [savedBanner, setSavedBanner] = useState(false)
  const [editingTemplateKey, setEditingTemplateKey] = useState<string | null>(null)

  // Retrieve store email branding
  let storeName = 'Artolika.Inc'
  let supportEmail = 'support@example.com'
  let senderEmail = 'no-reply@example.com'

  try {
    const storeContext = useStore()
    if (storeContext?.store) {
      if (storeContext.store.name) storeName = storeContext.store.name
      if (storeContext.store.customer_support_email) supportEmail = storeContext.store.customer_support_email
      if (storeContext.store.mail_from_address) senderEmail = storeContext.store.mail_from_address
    }
  } catch {
    // Outside store provider context fallback
  }

  const query = useQuery({
    queryKey: ['spree-reviews-settings', storeId],
    queryFn: () => reviewsClient.getSettings(),
  })

  useEffect(() => {
    if (query.data?.data) {
      setDraft(query.data.data)
    }
  }, [query.data])

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<ReviewSettings>) => reviewsClient.updateSettings(payload),
    onSuccess: (res) => {
      setDraft(res.data)
      setSavedBanner(true)
      setTimeout(() => setSavedBanner(false), 3000)
      void queryClient.invalidateQueries({ queryKey: ['spree-reviews-settings', storeId] })
    },
  })

  const updateField = <K extends keyof ReviewSettings>(key: K, value: ReviewSettings[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  if (query.isPending || !draft) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl">
        <PageHeader
          title="Reviews Settings"
          subtitle="Configure customer feedback moderation, incentives, media limits, and display styling."
        />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  if (query.error) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl">
        <PageHeader
          title="Reviews Settings"
          subtitle="Configure customer feedback moderation, incentives, media limits, and display styling."
        />
        <ErrorMessage error={query.error} />
      </div>
    )
  }

  const isMultiStep = (draft.modal_mode || 'multi') === 'multi'
  const rewardsEnabled = draft.rewards_enabled ?? true

  const selectedTemplate = REVIEW_EMAIL_DEFINITIONS.find((t) => t.key === editingTemplateKey)

  if (selectedTemplate && draft) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-none">
        <EmailTemplateCustomizerView
          template={selectedTemplate}
          draft={draft}
          canEdit={canEdit}
          storeName={storeName}
          supportEmail={supportEmail}
          senderEmail={senderEmail}
          onBack={() => setEditingTemplateKey(null)}
          updateField={updateField}
          onSave={() => saveMutation.mutate(draft)}
          isSaving={saveMutation.isPending}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl">
      <PageHeader
        title="Reviews Settings"
        subtitle="Configure customer feedback moderation, incentives, video uploads, and display styling."
        actions={
          <div className="flex items-center gap-3">
            {savedBanner && (
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Settings saved
              </span>
            )}
            <Button
              size="sm"
              disabled={!canEdit || saveMutation.isPending}
              onClick={() => saveMutation.mutate(draft)}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        }
      />

      {saveMutation.error && <ErrorMessage error={saveMutation.error} />}

      <div
        role="tablist"
        aria-label="Review settings sections"
        className="inline-flex w-fit items-center justify-center gap-1 rounded-lg bg-muted/60 p-1 text-muted-foreground"
      >
        {(
          [
            { id: 'general', label: 'General' },
            { id: 'settings', label: 'Settings' },
            { id: 'customisation', label: 'Appearance' },
            { id: 'marketing', label: 'Marketing' },
          ] as const
        ).map((tab) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-7 cursor-pointer items-center justify-center rounded-md px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all outline-none ${
                selected
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'general' && (
        <div className="flex flex-col gap-6">
          <SettingsSection
            title="General Policies"
            icon={<ShieldCheckIcon />}
            description="Control review visibility, moderation approval, and purchase verification rules."
          >
            <CardContent className="space-y-6 pt-4">
              <SettingToggle
                id="review-enabled"
                label="Enable Product Reviews"
                description="Allow customers to view and submit reviews on product pages."
                checked={draft.enabled}
                disabled={!canEdit}
                onChange={(val) => updateField('enabled', val)}
              />
              <SettingToggle
                id="review-require-approval"
                label="Require Approval"
                description="Reviews must be approved by store staff before appearing publicly on storefronts."
                checked={draft.require_approval}
                disabled={!canEdit}
                onChange={(val) => updateField('require_approval', val)}
              />
              <SettingToggle
                id="review-allow-anonymous"
                label="Allow Anonymous / Guest Reviews"
                description="Permit guest submissions without an account (when unverified buyers are also allowed)."
                checked={draft.allow_anonymous}
                disabled={!canEdit}
                onChange={(val) => updateField('allow_anonymous', val)}
              />
              <SettingToggle
                id="review-allow-unverified"
                label="Allow Unverified Purchasers"
                description="Permit reviews from customers who do not have a shipped order for this product."
                checked={draft.allow_unverified}
                disabled={!canEdit}
                onChange={(val) => updateField('allow_unverified', val)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <Label htmlFor="review-limit-policy" className="text-sm font-medium">
                    Reviews per Customer / Product
                  </Label>
                  <NativeSelect
                    id="review-limit-policy"
                    value={draft.reviews_per_product_limit || 'one_per_customer'}
                    disabled={!canEdit}
                    onChange={(e) => updateField('reviews_per_product_limit', e.target.value)}
                  >
                    <option value="one_per_customer">One per customer / order</option>
                    <option value="unlimited">Unlimited reviews</option>
                  </NativeSelect>
                </div>
              </div>
            </CardContent>
          </SettingsSection>

          <SettingsSection
            title="Submitted &amp; Published Review Editing"
            icon={<PencilIcon />}
            description="Control which fields and attachments customers may modify when updating a previously submitted review."
          >
            <CardContent className="space-y-6 pt-4">
              <SettingToggle
                id="review-edit-rating"
                label="Allow Editing Star Rating"
                description="Let customers change their star rating when updating an existing review."
                checked={draft.allow_edit_rating ?? true}
                disabled={!canEdit}
                onChange={(val) => updateField('allow_edit_rating', val)}
              />
              <SettingToggle
                id="review-edit-title"
                label="Allow Editing Review Headline"
                description="Let customers change the headline of a previously submitted review."
                checked={draft.allow_edit_title ?? true}
                disabled={!canEdit}
                onChange={(val) => updateField('allow_edit_title', val)}
              />
              <SettingToggle
                id="review-edit-body"
                label="Allow Editing Detailed Review Text"
                description="Let customers update the written review body after submission."
                checked={draft.allow_edit_body ?? true}
                disabled={!canEdit}
                onChange={(val) => updateField('allow_edit_body', val)}
              />
              <SettingToggle
                id="review-edit-remove-media"
                label="Allow Removing Existing Photos &amp; Videos"
                description="Let customers delete previously uploaded images or videos when editing a review."
                checked={draft.allow_edit_remove_media ?? true}
                disabled={!canEdit}
                onChange={(val) => updateField('allow_edit_remove_media', val)}
              />
              <SettingToggle
                id="review-edit-add-media"
                label="Allow Adding Additional Photos &amp; Videos"
                description="Let customers upload extra images or videos (up to the max attachment limit) while editing."
                checked={draft.allow_edit_add_media ?? true}
                disabled={!canEdit}
                onChange={(val) => updateField('allow_edit_add_media', val)}
              />
            </CardContent>
          </SettingsSection>

          <SettingsSection
            title="Photos &amp; Video Media Uploads"
            icon={<ImageIcon />}
            description="Configure customer photo and video upload allowances and size ceilings."
          >
            <CardContent className="space-y-6 pt-4">
              <SettingToggle
                id="review-allow-videos"
                label="Allow Video Uploads"
                description="Allow customers to upload product videos (MP4, MOV, WebM, OGG) alongside photos."
                checked={draft.allow_videos}
                disabled={!canEdit}
                onChange={(val) => updateField('allow_videos', val)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="review-max-media" className="text-sm font-medium">
                    Max Media Files per Review
                  </Label>
                  <Input
                    id="review-max-media"
                    type="number"
                    min={1}
                    max={10}
                    disabled={!canEdit}
                    value={draft.max_images_per_review ?? 5}
                    onChange={(e) =>
                      updateField('max_images_per_review', parseInt(e.target.value, 10) || 5)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-max-image-mb" className="text-sm font-medium">
                    Max Image Size (MB)
                  </Label>
                  <Input
                    id="review-max-image-mb"
                    type="number"
                    min={1}
                    max={50}
                    disabled={!canEdit}
                    value={draft.max_image_size_megabytes ?? 10}
                    onChange={(e) =>
                      updateField('max_image_size_megabytes', parseInt(e.target.value, 10) || 10)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-max-video-mb" className="text-sm font-medium">
                    Max Video Size (MB)
                  </Label>
                  <Input
                    id="review-max-video-mb"
                    type="number"
                    min={1}
                    max={250}
                    disabled={!canEdit || !draft.allow_videos}
                    value={draft.max_video_size_megabytes ?? 50}
                    onChange={(e) =>
                      updateField('max_video_size_megabytes', parseInt(e.target.value, 10) || 50)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </SettingsSection>

          <SettingsSection
            title="Spam Filtering &amp; Content Safety"
            icon={<ShieldAlertIcon />}
            description="Automatic spam detection, URL blocking, reporting thresholds, and rate limits."
          >
            <CardContent className="space-y-6 pt-4">
              <SettingToggle
                id="review-block-spam"
                label="Automatic Spam Detection"
                description="Automatically flag repetitive characters or blocked terms as spam."
                checked={draft.block_spam_reviews}
                disabled={!canEdit}
                onChange={(val) => updateField('block_spam_reviews', val)}
              />
              <SettingToggle
                id="review-disable-links"
                label="Block External Links &amp; URLs"
                description="Reject storefront submissions containing web URLs or affiliate links."
                checked={draft.disable_review_links}
                disabled={!canEdit}
                onChange={(val) => updateField('disable_review_links', val)}
              />
              <SettingToggle
                id="review-anonymize-ips"
                label="Anonymize Stored IP Addresses"
                description="Mask the final IP octet while preserving salted hashes for rate limiting."
                checked={draft.anonymize_ips}
                disabled={!canEdit}
                onChange={(val) => updateField('anonymize_ips', val)}
              />
              <div className="space-y-2">
                <Label htmlFor="review-spam-words" className="text-sm font-medium">
                  Blocked Keywords &amp; Spam Terms
                </Label>
                <Textarea
                  id="review-spam-words"
                  placeholder="e.g. buy now, discount code, casino (comma separated)"
                  disabled={!canEdit}
                  value={draft.spam_words || ''}
                  onChange={(e) => updateField('spam_words', e.target.value)}
                  className="h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="review-report-threshold" className="text-sm font-medium">
                    Report Auto-Hide Threshold
                  </Label>
                  <Input
                    id="review-report-threshold"
                    type="number"
                    min={1}
                    max={50}
                    disabled={!canEdit}
                    value={draft.report_moderation_threshold ?? 3}
                    onChange={(e) =>
                      updateField('report_moderation_threshold', parseInt(e.target.value, 10) || 3)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-customer-rate" className="text-sm font-medium">
                    Customer Hourly Limit
                  </Label>
                  <Input
                    id="review-customer-rate"
                    type="number"
                    min={1}
                    max={100}
                    disabled={!canEdit}
                    value={draft.customer_rate_limit_per_hour ?? 5}
                    onChange={(e) =>
                      updateField('customer_rate_limit_per_hour', parseInt(e.target.value, 10) || 5)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-ip-rate" className="text-sm font-medium">
                    Network IP Hourly Limit
                  </Label>
                  <Input
                    id="review-ip-rate"
                    type="number"
                    min={1}
                    max={100}
                    disabled={!canEdit}
                    value={draft.ip_rate_limit_per_hour ?? 10}
                    onChange={(e) =>
                      updateField('ip_rate_limit_per_hour', parseInt(e.target.value, 10) || 10)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-duplicate-window" className="text-sm font-medium">
                    Duplicate Window (Hours)
                  </Label>
                  <Input
                    id="review-duplicate-window"
                    type="number"
                    min={1}
                    max={168}
                    disabled={!canEdit}
                    value={draft.duplicate_detection_window_hours ?? 24}
                    onChange={(e) =>
                      updateField(
                        'duplicate_detection_window_hours',
                        parseInt(e.target.value, 10) || 24,
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </SettingsSection>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex flex-col gap-6">
          <SettingsSection
            title="Submission Flow"
            icon={<SlidersHorizontalIcon />}
            description="Choose how customers submit reviews and questionnaire answers in the storefront modal."
          >
            <CardContent className="space-y-6 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Modal Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    {isMultiStep
                      ? 'Multi-Step Wizard guides shoppers through rating, photo/video rewards, review details, and confirmation.'
                      : 'Single-Page Form collects rating, review text, optional answers, and media on one clean screen.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant={isMultiStep ? 'default' : 'outline'}
                    disabled={!canEdit}
                    onClick={() => updateField('modal_mode', 'multi')}
                  >
                    Multi-Step Wizard
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!isMultiStep ? 'default' : 'outline'}
                    disabled={!canEdit}
                    onClick={() => updateField('modal_mode', 'single')}
                  >
                    Single-Page Form
                  </Button>
                </div>
              </div>
            </CardContent>
          </SettingsSection>

          <SettingsSection
            title="Incentivized Reviews &amp; Gift Card Rewards"
            icon={<GiftIcon />}
            description="Automatically reward approved photo and video reviews with a store Gift Card."
          >
            <CardContent className="space-y-6 pt-4">
              <SettingToggle
                id="review-rewards-enabled"
                label="Enable Automatic Gift Card Rewards"
                description="Issue a customer Gift Card automatically when a review with photos or video is approved."
                checked={rewardsEnabled}
                disabled={!canEdit}
                onChange={(val) => updateField('rewards_enabled', val)}
              />

              {rewardsEnabled && (
                <div className="space-y-4">
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                    <SettingToggle
                      id="review-photo-reward"
                      label="Photo Review Reward"
                      description="Reward customers who upload photos with their review."
                      checked={draft.photo_reward_enabled ?? true}
                      disabled={!canEdit}
                      onChange={(val) => updateField('photo_reward_enabled', val)}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Discount (%)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          disabled={!canEdit}
                          value={draft.photo_reward_percentage ?? 15}
                          onChange={(e) => {
                            const pct = parseInt(e.target.value, 10) || 15
                            const prevPct = draft.photo_reward_percentage ?? 15
                            const defaultPrevText = `Get ${prevPct}% off your next purchase`
                            updateField('photo_reward_percentage', pct)
                            if (!draft.photo_reward_text || draft.photo_reward_text === defaultPrevText) {
                              updateField('photo_reward_text', `Get ${pct}% off your next purchase`)
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Gift Card Amount</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!canEdit}
                          value={draft.photo_reward_amount ?? 150}
                          onChange={(e) =>
                            updateField('photo_reward_amount', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Promotion Code / ID</Label>
                        <Input
                          placeholder="e.g. PHOTO15"
                          disabled={!canEdit}
                          value={draft.photo_reward_promotion_id || ''}
                          onChange={(e) => updateField('photo_reward_promotion_id', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Display Headline</Label>
                        <Input
                          disabled={!canEdit}
                          value={draft.photo_reward_text || 'Get 15% off your next purchase'}
                          onChange={(e) => updateField('photo_reward_text', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                    <SettingToggle
                      id="review-video-reward"
                      label="Video Review Reward"
                      description="Reward customers who upload a video with their review."
                      checked={draft.video_reward_enabled ?? true}
                      disabled={!canEdit}
                      onChange={(val) => updateField('video_reward_enabled', val)}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Discount (%)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          disabled={!canEdit}
                          value={draft.video_reward_percentage ?? 20}
                          onChange={(e) => {
                            const pct = parseInt(e.target.value, 10) || 20
                            const prevPct = draft.video_reward_percentage ?? 20
                            const defaultPrevText = `Get ${prevPct}% off your next purchase`
                            updateField('video_reward_percentage', pct)
                            if (!draft.video_reward_text || draft.video_reward_text === defaultPrevText) {
                              updateField('video_reward_text', `Get ${pct}% off your next purchase`)
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Gift Card Amount</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!canEdit}
                          value={draft.video_reward_amount ?? 200}
                          onChange={(e) =>
                            updateField('video_reward_amount', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Promotion Code / ID</Label>
                        <Input
                          placeholder="e.g. VIDEO20"
                          disabled={!canEdit}
                          value={draft.video_reward_promotion_id || ''}
                          onChange={(e) => updateField('video_reward_promotion_id', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Display Headline</Label>
                        <Input
                          disabled={!canEdit}
                          value={draft.video_reward_text || 'Get 20% off your next purchase'}
                          onChange={(e) => updateField('video_reward_text', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </SettingsSection>

          {!isMultiStep && (
            <SettingsSection
              title="Single-Page Form Settings"
              icon={<FileTextIcon />}
              description="Customize headers displayed inside the single-page review modal."
            >
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Form Title</Label>
                  <Input
                    disabled={!canEdit}
                    value={draft.single_form_title || 'Write a review'}
                    onChange={(e) => updateField('single_form_title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Form Description</Label>
                  <Input
                    disabled={!canEdit}
                    value={draft.single_form_description || 'Share your feedback for this product'}
                    onChange={(e) => updateField('single_form_description', e.target.value)}
                  />
                </div>
              </CardContent>
            </SettingsSection>
          )}
        </div>
      )}

      {activeTab === 'customisation' && (
        <div className="flex flex-col gap-6">
          <SettingsSection
            title="Multi-Step Wizard Copy"
            icon={<PencilIcon />}
            description="Customize titles, helper subtitles, and placeholders shown across all 4 wizard steps."
          >
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Step 1 Title (Stars)</Label>
                  <Input
                    disabled={!canEdit}
                    value={draft.step1_title || 'How would you rate this item?'}
                    onChange={(e) => updateField('step1_title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Low Rating Label</Label>
                  <Input
                    disabled={!canEdit}
                    value={draft.step1_dislike_label || 'Dislike it'}
                    onChange={(e) => updateField('step1_dislike_label', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">High Rating Label</Label>
                  <Input
                    disabled={!canEdit}
                    value={draft.step1_love_label || 'Love it!'}
                    onChange={(e) => updateField('step1_love_label', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Step 2 Title (Media)</Label>
                  <Input
                    disabled={!canEdit}
                    value={draft.step2_title || 'Show it off'}
                    onChange={(e) => updateField('step2_title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Step 2 Subtitle</Label>
                  <Input
                    disabled={!canEdit}
                    value={draft.step2_subtitle || "We'd love to see it in action!"}
                    onChange={(e) => updateField('step2_subtitle', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Step 3 Title (Written Review)</Label>
                  <Input
                    disabled={!canEdit}
                    value={draft.step3_title || 'Tell us more!'}
                    onChange={(e) => updateField('step3_title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Review Text Placeholder</Label>
                  <Input
                    disabled={!canEdit}
                    value={draft.step3_placeholder || 'Share your experience'}
                    onChange={(e) => updateField('step3_placeholder', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Step 4 Confirmation Title</Label>
                  <Input
                    disabled={!canEdit}
                    value={draft.step4_title || 'Thank you for posting!'}
                    onChange={(e) => updateField('step4_title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Step 4 Confirmation Subtitle</Label>
                  <Input
                    disabled={!canEdit}
                    value={
                      draft.step4_subtitle || 'Your feedback helps others make better choices.'
                    }
                    onChange={(e) => updateField('step4_subtitle', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </SettingsSection>

          <SettingsSection
            title="Single-Page Modal Labels"
            icon={<FileTextIcon />}
            description="Applies when Single-Page Form mode is active."
          >
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Form Title</Label>
                <Input
                  disabled={!canEdit}
                  value={draft.single_form_title || 'Write a review'}
                  onChange={(e) => updateField('single_form_title', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Form Description</Label>
                <Input
                  disabled={!canEdit}
                  value={draft.single_form_description || 'Share your feedback for this product'}
                  onChange={(e) => updateField('single_form_description', e.target.value)}
                />
              </div>
            </CardContent>
          </SettingsSection>

          <SettingsSection
            title="Appearance"
            icon={<PaletteIcon />}
            description="Customize storefront star colors, Verified Purchase badge color, and label formatting across product headers, product cards, and review sections."
          >
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Product Header Star Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Product Header Star Color"
                      disabled={!canEdit}
                      value={draft.title_star_color || '#FBBF24'}
                      onChange={(e) => updateField('title_star_color', e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded border border-border p-0.5"
                    />
                    <Input
                      disabled={!canEdit}
                      value={draft.title_star_color || '#FBBF24'}
                      onChange={(e) => updateField('title_star_color', e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Product Card Star Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Product Card Star Color"
                      disabled={!canEdit}
                      value={draft.product_card_star_color || '#FBBF24'}
                      onChange={(e) => updateField('product_card_star_color', e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded border border-border p-0.5"
                    />
                    <Input
                      disabled={!canEdit}
                      value={draft.product_card_star_color || '#FBBF24'}
                      onChange={(e) => updateField('product_card_star_color', e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Bottom Reviews Star Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Bottom Reviews Star Color"
                      disabled={!canEdit}
                      value={draft.bottom_star_color || '#FBBF24'}
                      onChange={(e) => updateField('bottom_star_color', e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded border border-border p-0.5"
                    />
                    <Input
                      disabled={!canEdit}
                      value={draft.bottom_star_color || '#FBBF24'}
                      onChange={(e) => updateField('bottom_star_color', e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Verified Tick Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Verified Tick Color"
                      disabled={!canEdit}
                      value={draft.verified_badge_color || '#000000'}
                      onChange={(e) => updateField('verified_badge_color', e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded border border-border p-0.5"
                    />
                    <Input
                      disabled={!canEdit}
                      value={draft.verified_badge_color || '#000000'}
                      onChange={(e) => updateField('verified_badge_color', e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Header Format</Label>
                  <Input
                    disabled={!canEdit}
                    value={draft.title_rating_format || '({rating}) {count} reviews'}
                    onChange={(e) => updateField('title_rating_format', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Reviews Label</Label>
                  <Input
                    disabled={!canEdit}
                    value={draft.title_reviews_label || 'reviews'}
                    onChange={(e) => updateField('title_reviews_label', e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-muted/10 p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Product Card Display Style</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose how rating stars appear on product catalog cards, search grids, and cart items.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Card Rating Format</Label>
                    <NativeSelect
                      id="product-card-format"
                      disabled={!canEdit}
                      value={draft.product_card_format || 'stars_count'}
                      onChange={(e) =>
                        updateField('product_card_format', e.target.value as 'stars_count' | 'single_star')
                      }
                    >
                      <option value="stars_count">Five stars & review count (★★★★★ (120))</option>
                      <option value="single_star">Single star & score (4.8 ★ (120))</option>
                    </NativeSelect>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start gap-4 pt-4 sm:pt-6">
                    <Switch
                      id="card-show-count"
                      disabled={!canEdit}
                      checked={draft.product_card_show_count !== false}
                      onCheckedChange={(val) => updateField('product_card_show_count', val)}
                    />
                    <Label htmlFor="card-show-count" className="text-xs font-medium cursor-pointer">
                      Show review count on product cards
                    </Label>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Live Storefront Preview
                </p>
                <div className="flex flex-wrap items-center gap-8">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Header:</span>
                    <StarDisplay rating={5} size="md" color={draft.title_star_color || '#FBBF24'} />
                    <span className="font-medium">
                      {(draft.title_rating_format || '({rating}) {count} reviews')
                        .replace('{rating}', '4.9')
                        .replace('{count}', '120')
                        .replace('reviews', draft.title_reviews_label || 'reviews')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Product card:</span>
                    {draft.product_card_format === 'single_star' ? (
                      <div className="flex items-center gap-1 font-semibold text-foreground">
                        <span>4.8</span>
                        <svg
                          className="w-4 h-4 shrink-0"
                          style={{
                            color: draft.product_card_star_color || '#FBBF24',
                            fill: draft.product_card_star_color || '#FBBF24',
                          }}
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {draft.product_card_show_count !== false && (
                          <span className="text-xs text-muted-foreground font-normal tabular-nums">(120)</span>
                        )}
                      </div>
                    ) : (
                      <>
                        <StarDisplay
                          rating={5}
                          size="sm"
                          color={draft.product_card_star_color || '#FBBF24'}
                        />
                        {draft.product_card_show_count !== false && (
                          <span className="text-xs text-muted-foreground tabular-nums">(120)</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Section:</span>
                    <StarDisplay
                      rating={5}
                      size="md"
                      color={draft.bottom_star_color || '#FBBF24'}
                    />
                    <span className="font-semibold">4.9 / 5</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">Verified tick:</span>
                    <span className="font-medium">Aarav P.</span>
                    <VerifiedCheckIcon color={draft.verified_badge_color || '#000000'} />
                  </div>
                </div>
              </div>
            </CardContent>
          </SettingsSection>

          <SettingsSection
            title="Action Buttons Customization"
            icon={<SlidersHorizontalIcon />}
            description="Customize colors and appearance for 'Write a Review' and 'Ask a Question' action buttons in the storefront."
          >
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Write a Review Button Styling */}
                <div className="rounded-xl border bg-muted/15 p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Write a Review Button</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Button style used in review summary and bottom sections.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Background</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Write a Review Button Background"
                          disabled={!canEdit}
                          value={draft.write_review_btn_bg || '#FFFFFF'}
                          onChange={(e) => updateField('write_review_btn_bg', e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border border-border p-0.5"
                        />
                        <Input
                          disabled={!canEdit}
                          value={draft.write_review_btn_bg || '#FFFFFF'}
                          onChange={(e) => updateField('write_review_btn_bg', e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Text Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Write a Review Button Text Color"
                          disabled={!canEdit}
                          value={draft.write_review_btn_text_color || '#0A0A0A'}
                          onChange={(e) => updateField('write_review_btn_text_color', e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border border-border p-0.5"
                        />
                        <Input
                          disabled={!canEdit}
                          value={draft.write_review_btn_text_color || '#0A0A0A'}
                          onChange={(e) => updateField('write_review_btn_text_color', e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Border Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Write a Review Button Border Color"
                          disabled={!canEdit}
                          value={draft.write_review_btn_border_color || '#0A0A0A'}
                          onChange={(e) => updateField('write_review_btn_border_color', e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border border-border p-0.5"
                        />
                        <Input
                          disabled={!canEdit}
                          value={draft.write_review_btn_border_color || '#0A0A0A'}
                          onChange={(e) => updateField('write_review_btn_border_color', e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ask a Question Button Styling */}
                <div className="rounded-xl border bg-muted/15 p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Ask a Question Button</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Button style used in review summary and customer Q&amp;A sections.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Background</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Ask a Question Button Background"
                          disabled={!canEdit}
                          value={draft.ask_question_btn_bg || '#404040'}
                          onChange={(e) => updateField('ask_question_btn_bg', e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border border-border p-0.5"
                        />
                        <Input
                          disabled={!canEdit}
                          value={draft.ask_question_btn_bg || '#404040'}
                          onChange={(e) => updateField('ask_question_btn_bg', e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Text Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Ask a Question Button Text Color"
                          disabled={!canEdit}
                          value={draft.ask_question_btn_text_color || '#FFFFFF'}
                          onChange={(e) => updateField('ask_question_btn_text_color', e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border border-border p-0.5"
                        />
                        <Input
                          disabled={!canEdit}
                          value={draft.ask_question_btn_text_color || '#FFFFFF'}
                          onChange={(e) => updateField('ask_question_btn_text_color', e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Border Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Ask a Question Button Border Color"
                          disabled={!canEdit}
                          value={draft.ask_question_btn_border_color || '#404040'}
                          onChange={(e) => updateField('ask_question_btn_border_color', e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border border-border p-0.5"
                        />
                        <Input
                          disabled={!canEdit}
                          value={draft.ask_question_btn_border_color || '#404040'}
                          onChange={(e) => updateField('ask_question_btn_border_color', e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Buttons Preview */}
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Live Action Buttons Preview
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    style={{
                      backgroundColor: draft.write_review_btn_bg || '#FFFFFF',
                      color: draft.write_review_btn_text_color || '#0A0A0A',
                      borderColor: draft.write_review_btn_border_color || '#0A0A0A',
                    }}
                    className="px-5 py-2.5 text-xs font-semibold rounded-full border shadow-xs transition-opacity hover:opacity-90 cursor-default"
                  >
                    Write a review
                  </button>
                  <button
                    type="button"
                    style={{
                      backgroundColor: draft.ask_question_btn_bg || '#404040',
                      color: draft.ask_question_btn_text_color || '#FFFFFF',
                      borderColor: draft.ask_question_btn_border_color || '#404040',
                    }}
                    className="px-5 py-2.5 text-xs font-semibold rounded-full border shadow-xs transition-opacity hover:opacity-90 cursor-default"
                  >
                    Ask a Question
                  </button>
                </div>
              </div>
            </CardContent>
          </SettingsSection>

          <SettingsSection
            title="Search Engine Snippet &amp; Schema Markup"
            icon={<SearchIcon />}
            description="Configure Schema.org Product structured data (JSON-LD) for Google Rich Snippets, star ratings, price, stock, and delivery badges in Google Search."
          >
            <CardContent className="space-y-6 pt-4">
              <SettingToggle
                id="schema-enabled"
                label="Enable Schema.org Rich Snippets (JSON-LD)"
                description="Inject structured data markup on product pages to qualify for rich Google search cards."
                checked={draft.schema_markup_enabled ?? true}
                disabled={!canEdit}
                onChange={(val) => updateField('schema_markup_enabled', val)}
              />
              <SettingToggle
                id="schema-include-rating"
                label="Include Aggregate Rating"
                description="Show overall average score and total review count as rich stars in search snippets."
                checked={draft.schema_include_aggregate_rating ?? true}
                disabled={!canEdit || draft.schema_markup_enabled === false}
                onChange={(val) => updateField('schema_include_aggregate_rating', val)}
              />
              <SettingToggle
                id="schema-include-reviews"
                label="Include Customer Reviews"
                description="Embed top approved review titles, bodies, and ratings inside structured data."
                checked={draft.schema_include_reviews ?? true}
                disabled={!canEdit || draft.schema_markup_enabled === false}
                onChange={(val) => updateField('schema_include_reviews', val)}
              />
              <SettingToggle
                id="schema-include-offers"
                label="Include Pricing &amp; Stock Availability"
                description="Expose product price, currency, and real-time inventory status in Google Shopping &amp; Search."
                checked={draft.schema_include_offers ?? true}
                disabled={!canEdit || draft.schema_markup_enabled === false}
                onChange={(val) => updateField('schema_include_offers', val)}
              />
              <SettingToggle
                id="schema-show-shipping"
                label="Include Delivery &amp; Shipping Indicator"
                description="Add free delivery / standard shipping metadata to Google Search offers."
                checked={draft.schema_show_shipping ?? true}
                disabled={!canEdit || draft.schema_markup_enabled === false}
                onChange={(val) => updateField('schema_show_shipping', val)}
              />
              <SettingToggle
                id="schema-show-returns"
                label="Include Return Policy Indicator"
                description="Add merchant return policy (e.g. 7-day returns) metadata to Google Search offers."
                checked={draft.schema_show_returns ?? true}
                disabled={!canEdit || draft.schema_markup_enabled === false}
                onChange={(val) => updateField('schema_show_returns', val)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Return Window (Days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    disabled={!canEdit || draft.schema_markup_enabled === false}
                    value={draft.schema_return_days ?? 7}
                    onChange={(e) =>
                      updateField('schema_return_days', Number(e.target.value) || 7)
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Days allowed for returns.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Price Validity (Days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    disabled={!canEdit || draft.schema_markup_enabled === false}
                    value={draft.schema_price_valid_days ?? 30}
                    onChange={(e) =>
                      updateField('schema_price_valid_days', Number(e.target.value) || 30)
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Offer price expiration.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Item Condition</Label>
                  <NativeSelect
                    disabled={!canEdit || draft.schema_markup_enabled === false}
                    value={draft.schema_item_condition || 'NewCondition'}
                    onChange={(e) => updateField('schema_item_condition', e.target.value)}
                  >
                    <option value="NewCondition">New (Brand New)</option>
                    <option value="RefurbishedCondition">Refurbished</option>
                    <option value="UsedCondition">Used</option>
                    <option value="DamagedCondition">Damaged</option>
                  </NativeSelect>
                  <p className="text-[11px] text-muted-foreground">
                    Schema.org condition.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Max Reviews</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    disabled={!canEdit || draft.schema_markup_enabled === false}
                    value={draft.schema_max_reviews_count ?? 10}
                    onChange={(e) =>
                      updateField('schema_max_reviews_count', Number(e.target.value) || 10)
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Reviews count in schema.
                  </p>
                </div>
              </div>

              {/* Live Google Search Snippet Preview */}
              <div className="rounded-lg border bg-background p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Google Search Result Snippet Preview
                    </span>
                  </div>
                  {draft.schema_markup_enabled === false ? (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                      Structured Data Disabled
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                      Rich Snippet Active
                    </span>
                  )}
                </div>

                <div className="font-sans max-w-xl space-y-1 text-left">
                  {/* Google search URL / breadcrumb */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Your Store</span>
                    <span>›</span>
                    <span>products</span>
                    <span>›</span>
                    <span className="truncate">lorem-ipsum-product</span>
                  </div>

                  {/* Title Link */}
                  <div className="text-base text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer">
                    Lorem Ipsum Dolor - Premium Store Collection
                  </div>

                  {/* Rich Snippet Details Line */}
                  {draft.schema_markup_enabled !== false && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground py-0.5">
                      {draft.schema_include_aggregate_rating !== false && (
                        <div className="flex items-center gap-1 font-medium text-foreground">
                          <span style={{ color: draft.title_star_color || '#FBBF24' }}>
                            ★
                          </span>
                          <span>4.1 · ‎1.5K reviews</span>
                        </div>
                      )}
                      {draft.schema_include_offers !== false && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-foreground">₹2,900.00</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                            <span className="inline-block size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                            In stock
                          </span>
                        </>
                      )}
                      {draft.schema_show_shipping !== false && (
                        <>
                          <span>·</span>
                          <span className="text-muted-foreground">Free delivery</span>
                        </>
                      )}
                      {draft.schema_show_returns !== false && (
                        <>
                          <span>·</span>
                          <span className="text-muted-foreground">
                            {draft.schema_return_days ?? 7}-day returns
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Snippet Description with Thumbnail Image on Right */}
                  <div className="flex items-start justify-between gap-4 pt-1">
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1 m-0">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
                    </p>
                    <div className="size-16 sm:size-20 rounded-lg overflow-hidden border border-border bg-muted/40 shrink-0 shadow-xs flex items-center justify-center">
                      <svg
                        className="size-8 text-muted-foreground/40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </SettingsSection>
        </div>
      )}

      {activeTab === 'marketing' && (
        <ReviewMarketingSettingsTab
          draft={draft}
          canEdit={canEdit}
          updateField={updateField}
          onSave={() => saveMutation.mutate(draft)}
          isSaving={saveMutation.isPending}
          onEditTemplate={(key) => setEditingTemplateKey(key)}
        />
      )}
    </div>
  )
}

function SettingToggle({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  )
}

interface ReviewEmailTemplateDefinition {
  key: string
  id: string
  name: string
  description: string
  subjectField: keyof ReviewSettings
  bodyField: keyof ReviewSettings
  defaultSubject: string
  defaultBody: string
  variables: { name: string; desc: string }[]
}

const REVIEW_EMAIL_DEFINITIONS: ReviewEmailTemplateDefinition[] = [
  {
    key: 'review_posted',
    id: 'spree.product_review_mailer.review_posted_email',
    name: 'Review Posted',
    description: 'Sent to customers immediately after they submit a new product review.',
    subjectField: 'email_review_posted_subject',
    bodyField: 'email_review_posted_body',
    defaultSubject: '{{ store.name }} - Thank you for reviewing {{ review.product_name }}',
    defaultBody: `<mj-section>
  <mj-column css-class="hero">
    <mj-text mj-class="heading">Thank you for your feedback!</mj-text>
    <mj-text mj-class="greeting">Hello {{ review.author_name }},</mj-text>
    <mj-text mj-class="lead">We have received your {{ review.rating }}-star review for <strong>{{ review.product_name }}</strong>.</mj-text>
    <mj-text mj-class="body">"{{ review.body }}"</mj-text>
    <mj-button href="{{ review.product_url }}">View Product</mj-button>
    <mj-text mj-class="note">Your review will be visible once reviewed by our moderation team.</mj-text>
  </mj-column>
</mj-section>`,
    variables: [
      { name: '{{ store.name }}', desc: 'Your store name' },
      { name: '{{ store.url }}', desc: 'Storefront URL' },
      { name: '{{ review.author_name }}', desc: 'Reviewer name' },
      { name: '{{ review.product_name }}', desc: 'Product title' },
      { name: '{{ review.rating }}', desc: 'Numeric rating (1-5)' },
      { name: '{{ review.body }}', desc: 'Review text' },
      { name: '{{ review.product_url }}', desc: 'Product page URL' },
    ],
  },
  {
    key: 'review_approved',
    id: 'spree.product_review_mailer.review_approved_email',
    name: 'Review Approved & Published',
    description: 'Sent to the customer when moderation approves their review and makes it live.',
    subjectField: 'email_review_approved_subject',
    bodyField: 'email_review_approved_body',
    defaultSubject: '{{ store.name }} - Your review on {{ review.product_name }} is live!',
    defaultBody: `<mj-section>
  <mj-column css-class="hero">
    <mj-text mj-class="heading">Your review has been published!</mj-text>
    <mj-text mj-class="greeting">Hello {{ review.author_name }},</mj-text>
    <mj-text mj-class="lead">Great news! Your {{ review.rating }}-star review for <strong>{{ review.product_name }}</strong> has been approved and is now live on our store.</mj-text>
    <mj-button href="{{ review.product_url }}">View Your Review</mj-button>
    <mj-text mj-class="note">Thank you for helping fellow shoppers make informed choices.</mj-text>
  </mj-column>
</mj-section>`,
    variables: [
      { name: '{{ store.name }}', desc: 'Your store name' },
      { name: '{{ review.author_name }}', desc: 'Reviewer name' },
      { name: '{{ review.product_name }}', desc: 'Product title' },
      { name: '{{ review.rating }}', desc: 'Numeric rating (1-5)' },
      { name: '{{ review.product_url }}', desc: 'Product page URL' },
    ],
  },
  {
    key: 'review_rejected',
    id: 'spree.product_review_mailer.review_rejected_email',
    name: 'Review Rejected',
    description: 'Sent to the customer if their review does not meet store guidelines.',
    subjectField: 'email_review_rejected_subject',
    bodyField: 'email_review_rejected_body',
    defaultSubject: '{{ store.name }} - Update regarding your review on {{ review.product_name }}',
    defaultBody: `<mj-section>
  <mj-column css-class="hero">
    <mj-text mj-class="heading">Review Update</mj-text>
    <mj-text mj-class="greeting">Hello {{ review.author_name }},</mj-text>
    <mj-text mj-class="lead">Thank you for submitting a review for <strong>{{ review.product_name }}</strong>. Unfortunately, your submission could not be published because it did not meet our community guidelines.</mj-text>
    {% if review.moderator_note != blank %}
    <mj-text mj-class="body">Reason: {{ review.moderator_note }}</mj-text>
    {% endif %}
    <mj-button href="{{ review.product_url }}">Visit Product Page</mj-button>
  </mj-column>
</mj-section>`,
    variables: [
      { name: '{{ store.name }}', desc: 'Your store name' },
      { name: '{{ review.author_name }}', desc: 'Reviewer name' },
      { name: '{{ review.product_name }}', desc: 'Product title' },
      { name: '{{ review.moderator_note }}', desc: 'Staff explanation note' },
      { name: '{{ review.product_url }}', desc: 'Product page URL' },
    ],
  },
  {
    key: 'review_spam',
    id: 'spree.product_review_mailer.review_spam_email',
    name: 'Review Spam Flagged',
    description: 'Sent when a review is flagged as spam by automated or manual moderation.',
    subjectField: 'email_review_spam_subject',
    bodyField: 'email_review_spam_body',
    defaultSubject: '{{ store.name }} - Notice regarding your review',
    defaultBody: `<mj-section>
  <mj-column css-class="hero">
    <mj-text mj-class="heading">Review Flagged</mj-text>
    <mj-text mj-class="greeting">Hello {{ review.author_name }},</mj-text>
    <mj-text mj-class="lead">Your recent review for {{ review.product_name }} was automatically flagged by our spam filter and removed.</mj-text>
    <mj-text mj-class="note">If you believe this was an error, please reach out to customer support.</mj-text>
  </mj-column>
</mj-section>`,
    variables: [
      { name: '{{ store.name }}', desc: 'Your store name' },
      { name: '{{ review.author_name }}', desc: 'Reviewer name' },
      { name: '{{ review.product_name }}', desc: 'Product title' },
    ],
  },
  {
    key: 'review_deleted',
    id: 'spree.product_review_mailer.review_deleted_email',
    name: 'Review Deleted',
    description: 'Sent to the customer when their existing review is removed or deleted.',
    subjectField: 'email_review_deleted_subject',
    bodyField: 'email_review_deleted_body',
    defaultSubject: '{{ store.name }} - Your review on {{ review.product_name }} has been removed',
    defaultBody: `<mj-section>
  <mj-column css-class="hero">
    <mj-text mj-class="heading">Review Removed</mj-text>
    <mj-text mj-class="greeting">Hello {{ review.author_name }},</mj-text>
    <mj-text mj-class="lead">Your review for <strong>{{ review.product_name }}</strong> has been removed from our store.</mj-text>
    <mj-text mj-class="note">If you have any questions or concerns, please contact our support team.</mj-text>
  </mj-column>
</mj-section>`,
    variables: [
      { name: '{{ store.name }}', desc: 'Your store name' },
      { name: '{{ review.author_name }}', desc: 'Reviewer name' },
      { name: '{{ review.product_name }}', desc: 'Product title' },
    ],
  },
  {
    key: 'solicit_review',
    id: 'spree.product_review_mailer.solicit_review_email',
    name: 'Collect Review on Purchase',
    description: 'Sent to customers after delivery to invite them to review their purchased products.',
    subjectField: 'email_solicit_review_subject',
    bodyField: 'email_solicit_review_body',
    defaultSubject: '{{ store.name }} - How do you like your recent purchase?',
    defaultBody: `<mj-section>
  <mj-column css-class="hero">
    <mj-text mj-class="heading">How did we do?</mj-text>
    <mj-text mj-class="greeting">Hello,</mj-text>
    <mj-text mj-class="lead">Thank you for your recent purchase of <strong>{{ product.name }}</strong>! We would love to hear your thoughts.</mj-text>
    <mj-button href="{{ product.url }}">Write a Review</mj-button>
    <mj-text mj-class="note">It only takes a minute and helps fellow customers make informed decisions.</mj-text>
  </mj-column>
</mj-section>`,
    variables: [
      { name: '{{ store.name }}', desc: 'Your store name' },
      { name: '{{ product.name }}', desc: 'Purchased product title' },
      { name: '{{ product.url }}', desc: 'Link to leave review' },
    ],
  },
]

const SAMPLE_PREVIEW_DATA = {
  store: {
    name: 'Artolika.Inc',
    url: 'https://thewallx.com',
    customer_support_email: 'care@thewallx.com',
    mail_from_address: 'no-reply@thewallx.com',
  },
  review: {
    author_name: 'Aarav P.',
    product_name: 'Handcrafted Wall Art Test',
    rating: 5,
    title: 'Stunning Canvas Artwork',
    body: 'The craftsmanship on this canvas is exceptional! Textures and rich colors look even better in person.',
    product_url: 'https://thewallx.com/products/handcrafted-wall-art-test',
    moderator_note: 'Contains promotional links or spam patterns.',
  },
  product: {
    name: 'Handcrafted Wall Art Test',
    url: 'https://thewallx.com/products/handcrafted-wall-art-test',
  },
}

function interpolateVariables(
  text: string,
  storeName?: string,
  supportEmail?: string,
  fromEmail?: string,
): string {
  if (!text) return ''
  const sName = storeName || SAMPLE_PREVIEW_DATA.store.name
  const supEmail = supportEmail || SAMPLE_PREVIEW_DATA.store.customer_support_email
  const frmEmail = fromEmail || SAMPLE_PREVIEW_DATA.store.mail_from_address
  const rev = SAMPLE_PREVIEW_DATA.review
  const prod = SAMPLE_PREVIEW_DATA.product

  return text
    .replace(/\{\{\s*store\.name\s*\}\}/g, sName)
    .replace(/\{\{\s*store\.url\s*\}\}/g, SAMPLE_PREVIEW_DATA.store.url)
    .replace(/\{\{\s*store\.customer_support_email\s*\}\}/g, supEmail)
    .replace(/\{\{\s*store\.mail_from_address\s*\}\}/g, frmEmail)
    .replace(/\{\{\s*review\.product_name\s*\}\}/g, rev.product_name)
    .replace(/\{\{\s*review\.author_name\s*\}\}/g, rev.author_name)
    .replace(/\{\{\s*review\.rating\s*\}\}/g, String(rev.rating))
    .replace(/\{\{\s*review\.title\s*\}\}/g, rev.title)
    .replace(/\{\{\s*review\.body\s*\}\}/g, rev.body)
    .replace(/\{\{\s*review\.product_url\s*\}\}/g, rev.product_url)
    .replace(/\{\{\s*review\.moderator_note\s*\}\}/g, rev.moderator_note)
    .replace(/\{\{\s*product\.name\s*\}\}/g, prod.name)
    .replace(/\{\{\s*product\.url\s*\}\}/g, prod.url)
    .replace(/\{%\s*if\s+resend\s*%\}.*?\{%\s*endif\s*%\}/g, '')
    .replace(/\{%\s*if\s+review\.moderator_note\s*!=\s*blank\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, '$1')
}

function parseMjmlElements(content: string) {
  let heading = ''
  let greeting = ''
  let lead = ''
  let bodyQuote = ''
  let buttonText = ''
  let buttonHref = ''
  let note = ''

  const headingMatch = content.match(/<mj-text[^>]*mj-class=["']heading["'][^>]*>([\s\S]*?)<\/mj-text>/i)
  if (headingMatch) heading = headingMatch[1].replace(/<\/?[^>]+(>|$)/g, '').trim()

  const greetingMatch = content.match(/<mj-text[^>]*mj-class=["']greeting["'][^>]*>([\s\S]*?)<\/mj-text>/i)
  if (greetingMatch) greeting = greetingMatch[1].replace(/<\/?[^>]+(>|$)/g, '').trim()

  const leadMatch = content.match(/<mj-text[^>]*mj-class=["']lead["'][^>]*>([\s\S]*?)<\/mj-text>/i)
  if (leadMatch) lead = leadMatch[1].replace(/<\/?[^>]+(>|$)/g, '').trim()

  const bodyMatch = content.match(/<mj-text[^>]*mj-class=["']body["'][^>]*>([\s\S]*?)<\/mj-text>/i)
  if (bodyMatch) bodyQuote = bodyMatch[1].replace(/<\/?[^>]+(>|$)/g, '').trim()

  const buttonMatch = content.match(/<mj-button[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/mj-button>/i)
  if (buttonMatch) {
    buttonHref = buttonMatch[1]
    buttonText = buttonMatch[2].replace(/<\/?[^>]+(>|$)/g, '').trim()
  }

  const noteMatch = content.match(/<mj-text[^>]*mj-class=["']note["'][^>]*>([\s\S]*?)<\/mj-text>/i)
  if (noteMatch) note = noteMatch[1].replace(/<\/?[^>]+(>|$)/g, '').trim()

  return { heading, greeting, lead, bodyQuote, buttonText, buttonHref, note }
}

function EmailLivePreviewCard({
  template,
  subject,
  body,
  starColor,
  storeName,
  supportEmail,
  senderEmail,
  mode,
  device,
}: {
  template: ReviewEmailTemplateDefinition
  subject: string
  body: string
  starColor: string
  storeName: string
  supportEmail: string
  senderEmail: string
  mode: 'email' | 'text'
  device: 'desktop' | 'mobile'
}) {
  const interpolatedSubject = interpolateVariables(subject, storeName, supportEmail, senderEmail)
  const interpolatedBody = interpolateVariables(body, storeName, supportEmail, senderEmail)
  const parsed = parseMjmlElements(interpolatedBody)
  const isReviewTemplate = template.key === 'review_posted' || template.key === 'review_approved'

  return (
    <div className="space-y-3">
      {/* Subject Line Bar */}
      <div className="rounded-lg bg-muted/40 border px-3.5 py-2.5 flex items-center gap-2 text-xs">
        <span className="font-semibold text-muted-foreground shrink-0 uppercase tracking-wider text-[10px]">
          Subject:
        </span>
        <span className="font-medium text-foreground truncate">{interpolatedSubject}</span>
      </div>

      {mode === 'text' ? (
        <div className="rounded-xl border bg-muted/20 p-5 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto">
          {`Subject: ${interpolatedSubject}\n\n`}
          {`${storeName.toUpperCase()}\n----------------------------------------\n\n`}
          {parsed.heading ? `${parsed.heading}\n\n` : ''}
          {parsed.greeting ? `${parsed.greeting}\n\n` : ''}
          {parsed.lead ? `${parsed.lead}\n\n` : ''}
          {parsed.bodyQuote ? `"${parsed.bodyQuote}"\n\n` : ''}
          {parsed.buttonText ? `[ ${parsed.buttonText} ] -> ${parsed.buttonHref || 'https://thewallx.com'}\n\n` : ''}
          {parsed.note ? `${parsed.note}\n\n` : ''}
          {`----------------------------------------\n© 2026 ${storeName}. All rights reserved.\nSupport: ${supportEmail}`}
        </div>
      ) : (
        <div className="rounded-xl border bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6 flex justify-center overflow-x-auto min-h-[420px]">
          <div
            className={`transition-all duration-200 bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-md ${
              device === 'mobile'
                ? 'w-[320px] rounded-3xl p-4 border-4 border-neutral-700 shadow-xl'
                : 'w-full max-w-[500px] rounded-xl p-6'
            }`}
          >
            {/* Email Header */}
            <div className="border-b border-neutral-200/80 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <span className="text-xs font-black tracking-widest uppercase text-neutral-900 dark:text-white">
                {storeName}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">Storefront Email</span>
            </div>

            {/* Email Body */}
            <div className="py-5 space-y-3.5">
              {parsed.heading && (
                <h4 className="text-base font-bold text-neutral-900 dark:text-white m-0 leading-snug">
                  {parsed.heading}
                </h4>
              )}

              {parsed.greeting && (
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 m-0">
                  {parsed.greeting}
                </p>
              )}

              {parsed.lead && (
                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed m-0">
                  {parsed.lead}
                </p>
              )}

              {isReviewTemplate && (
                <div className="flex items-center gap-1 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="w-4 h-4 shrink-0"
                      style={{ color: starColor, fill: starColor }}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                  <span className="text-[11px] font-semibold text-neutral-500 ml-1">5.0 / 5</span>
                </div>
              )}

              {parsed.bodyQuote && (
                <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 p-3 italic text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed">
                  "{parsed.bodyQuote}"
                </div>
              )}

              {parsed.buttonText && (
                <div className="pt-2">
                  <div className="inline-block px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold rounded-lg shadow-xs hover:opacity-95 cursor-default">
                    {parsed.buttonText}
                  </div>
                </div>
              )}

              {parsed.note && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 m-0 pt-1 leading-relaxed">
                  {parsed.note}
                </p>
              )}
            </div>

            {/* Email Footer */}
            <div className="border-t border-neutral-200/80 dark:border-neutral-800 pt-3 text-[10px] text-neutral-400 space-y-1">
              <p className="m-0">© 2026 {storeName}. All rights reserved.</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span>Support: {supportEmail}</span>
                <span>•</span>
                <span>From: {senderEmail}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmailTemplateCustomizerView({
  template,
  draft,
  canEdit,
  storeName,
  supportEmail,
  senderEmail,
  onBack,
  updateField,
  onSave,
  isSaving,
}: {
  template: ReviewEmailTemplateDefinition
  draft: ReviewSettings
  canEdit: boolean
  storeName: string
  supportEmail: string
  senderEmail: string
  onBack: () => void
  updateField: <K extends keyof ReviewSettings>(key: K, value: ReviewSettings[K]) => void
  onSave: () => void
  isSaving: boolean
}) {
  const currentSubject = (draft[template.subjectField] as string) || template.defaultSubject
  const currentBody = (draft[template.bodyField] as string) || template.defaultBody
  const isCustomized = Boolean(draft[template.subjectField] || draft[template.bodyField])

  const [previewMode, setPreviewMode] = useState<'email' | 'text'>('email')
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop')
  const starColor = draft.bottom_star_color || '#FBBF24'
  const bodyLines = (currentBody || template.defaultBody || '').split('\n')

  const handleResetToDefault = () => {
    updateField(template.subjectField, '' as any)
    updateField(template.bodyField, '' as any)
  }

  const handleInsertVariable = (varName: string) => {
    const existing = currentBody || template.defaultBody
    updateField(template.bodyField, (existing + ` ${varName}`) as any)
  }

  return (
    <div className="space-y-6">
      {/* Editor Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
          >
            ← Back to templates
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold tracking-tight text-foreground m-0">
                {template.name}
              </h3>
              {isCustomized ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold uppercase">
                  Customized
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] uppercase font-normal text-muted-foreground">
                  Default template
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isCustomized && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canEdit || isSaving}
              onClick={handleResetToDefault}
              className="h-8 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
            >
              Reset to default
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!canEdit || isSaving}
            onClick={onSave}
            className="h-8 text-xs font-semibold cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>

      {/* 2-Column Split: Editor (Left) & Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Template Editor */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Email Subject</CardTitle>
              <CardDescription className="text-xs">
                Subject line rendered in the customer's inbox.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                disabled={!canEdit}
                value={currentSubject}
                onChange={(e) => updateField(template.subjectField, e.target.value as any)}
                placeholder={template.defaultSubject}
                className="font-mono text-xs sm:text-sm"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground mr-1">Insert:</span>
                {template.variables.slice(0, 4).map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      updateField(template.subjectField, `${currentSubject} ${v.name}` as any)
                    }}
                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted text-[11px] font-mono text-foreground/80 cursor-pointer transition-colors"
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Template Content</CardTitle>
                  <CardDescription className="text-xs">
                    Liquid markup and MJML email elements.
                  </CardDescription>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase bg-muted/60 px-2 py-0.5 rounded">
                  MJML / Liquid
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex border rounded-lg bg-card overflow-hidden focus-within:ring-1 focus-within:ring-primary">
                <div className="select-none bg-muted/40 px-2.5 py-3 text-right font-mono text-[11px] text-muted-foreground/60 border-r border-border leading-relaxed min-w-[2.5rem]">
                  {bodyLines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <Textarea
                  disabled={!canEdit}
                  rows={Math.max(16, bodyLines.length)}
                  value={currentBody}
                  onChange={(e) => updateField(template.bodyField, e.target.value as any)}
                  placeholder={template.defaultBody}
                  className="font-mono text-xs bg-transparent border-0 rounded-none p-3 w-full focus:outline-none focus:ring-0 leading-relaxed resize-y"
                />
              </div>
            </CardContent>
          </Card>

          {/* Variables Reference */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Available Dynamic Variables
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border text-xs">
                {template.variables.map((v) => (
                  <div
                    key={v.name}
                    className="flex items-center justify-between px-4 py-2 hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <code className="text-[11px] font-bold text-foreground bg-muted/50 px-1 py-0.5 rounded">
                        {v.name}
                      </code>
                      <p className="text-[11px] text-muted-foreground">{v.desc}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-primary hover:text-primary cursor-pointer"
                      onClick={() => handleInsertVariable(v.name)}
                    >
                      + Insert
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Working Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold">Live Customer Preview</CardTitle>
                  <CardDescription className="text-xs">
                    Real-time rendering using store email branding &amp; sample data.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {/* Mode Switcher */}
                  <div className="inline-flex rounded-lg border bg-muted/30 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('email')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                        previewMode === 'email'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('text')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                        previewMode === 'text'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Plain text
                    </button>
                  </div>

                  {/* Device Switcher */}
                  <div className="inline-flex rounded-lg border bg-muted/30 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setDeviceMode('desktop')}
                      title="Desktop view"
                      className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                        deviceMode === 'desktop'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="20" height="14" x="2" y="3" rx="2" />
                        <line x1="8" x2="16" y1="21" y2="21" />
                        <line x1="12" x2="12" y1="17" y2="21" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceMode('mobile')}
                      title="Mobile view"
                      className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                        deviceMode === 'mobile'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                        <line x1="12" x2="12.01" y1="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <EmailLivePreviewCard
                template={template}
                subject={currentSubject}
                body={currentBody}
                starColor={starColor}
                storeName={storeName}
                supportEmail={supportEmail}
                senderEmail={senderEmail}
                mode={previewMode}
                device={deviceMode}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ReviewMarketingSettingsTab({
  draft,
  canEdit,
  updateField,
  onSave: _onSave,
  isSaving: _isSaving,
  onEditTemplate,
}: {
  draft: ReviewSettings
  canEdit: boolean
  updateField: <K extends keyof ReviewSettings>(key: K, value: ReviewSettings[K]) => void
  onSave: () => void
  isSaving: boolean
  onEditTemplate: (key: string) => void
}) {
  const [previewModalTemplate, setPreviewModalTemplate] = useState<ReviewEmailTemplateDefinition | null>(null)
  const emailsEnabled = draft.send_review_emails_to_customers !== false

  // Retrieve store email branding from @spree/dashboard-core
  let storeName = 'Artolika.Inc'
  let supportEmail = 'support@example.com'
  let senderEmail = 'no-reply@example.com'

  try {
    const storeContext = useStore()
    if (storeContext?.store) {
      if (storeContext.store.name) storeName = storeContext.store.name
      if (storeContext.store.customer_support_email) supportEmail = storeContext.store.customer_support_email
      if (storeContext.store.mail_from_address) senderEmail = storeContext.store.mail_from_address
    }
  } catch {
    // Outside store provider context fallback
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Customer Email Notifications"
        icon={<MailIcon />}
        description="Configure automated transactional email notifications sent to customers throughout the review lifecycle."
      >
        <CardContent className="space-y-6 pt-4">
          <SettingToggle
            id="send-review-emails-master"
            label="Send review emails to customers"
            description="Master toggle to enable or disable all automated customer review emails."
            checked={emailsEnabled}
            disabled={!canEdit}
            onChange={(val) => updateField('send_review_emails_to_customers', val)}
          />

          {emailsEnabled && (
            <div className="ml-2 pl-4 border-l-2 border-border/80 space-y-4 pt-2">
              <SettingToggle
                id="send-review-posted"
                label="Review Submitted Confirmation"
                description="Email customers as soon as their review is successfully submitted."
                checked={draft.send_review_posted_email !== false}
                disabled={!canEdit}
                onChange={(val) => updateField('send_review_posted_email', val)}
              />

              <SettingToggle
                id="send-review-approved"
                label="Review Approved &amp; Published Notification"
                description="Notify reviewers when their submission is approved by a moderator and published live."
                checked={draft.send_review_approved_email !== false}
                disabled={!canEdit}
                onChange={(val) => updateField('send_review_approved_email', val)}
              />

              <SettingToggle
                id="send-review-rejected"
                label="Review Rejection Notification"
                description="Send an explanation to customers when their review cannot be published."
                checked={Boolean(draft.send_review_rejected_email)}
                disabled={!canEdit}
                onChange={(val) => updateField('send_review_rejected_email', val)}
              />

              <SettingToggle
                id="send-review-spam"
                label="Spam Flagging Notification"
                description="Alert customers when their review is flagged by spam protection filters."
                checked={Boolean(draft.send_review_spam_email)}
                disabled={!canEdit}
                onChange={(val) => updateField('send_review_spam_email', val)}
              />

              <SettingToggle
                id="send-review-deleted"
                label="Review Removal Notification"
                description="Inform customers if an existing review is deleted from the store."
                checked={Boolean(draft.send_review_deleted_email)}
                disabled={!canEdit}
                onChange={(val) => updateField('send_review_deleted_email', val)}
              />

              <SettingToggle
                id="send-solicit-review"
                label="Collect Reviews on Purchase"
                description="Automatically solicit feedback from buyers after their orders are completed or delivered."
                checked={draft.send_solicit_review_email !== false}
                disabled={!canEdit}
                onChange={(val) => updateField('send_solicit_review_email', val)}
              />
            </div>
          )}
        </CardContent>
      </SettingsSection>

      <SettingsSection
        title="Email Templates"
        icon={<FileTextIcon />}
        description="Customize email subjects and message contents directly inside Review Settings with instant live preview."
      >
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {REVIEW_EMAIL_DEFINITIONS.map((tmpl) => {
              const currentSubject = (draft[tmpl.subjectField] as string) || tmpl.defaultSubject
              const isCustomized = Boolean(draft[tmpl.subjectField] || draft[tmpl.bodyField])

              return (
                <li
                  key={tmpl.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{tmpl.name}</span>
                      {isCustomized ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold uppercase py-0 px-1.5">
                          Customized
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-normal uppercase py-0 px-1.5">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                    <p className="text-xs font-mono text-muted-foreground/80 line-clamp-1">{currentSubject}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs cursor-pointer"
                      onClick={() => setPreviewModalTemplate(tmpl)}
                    >
                      Quick Preview
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs font-semibold cursor-pointer"
                      onClick={() => onEditTemplate(tmpl.key)}
                    >
                      Customize Template
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </SettingsSection>

      {/* Quick Preview Modal */}
      {previewModalTemplate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="fixed inset-0" onClick={() => setPreviewModalTemplate(null)} />
          <div className="relative z-10 w-full max-w-2xl rounded-xl bg-card border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b flex items-center justify-between bg-muted/40">
              <div>
                <h4 className="text-sm font-bold text-foreground m-0">{previewModalTemplate.name}</h4>
                <p className="text-xs text-muted-foreground m-0 font-mono mt-0.5">{previewModalTemplate.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalTemplate(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <EmailLivePreviewCard
                template={previewModalTemplate}
                subject={
                  (draft[previewModalTemplate.subjectField] as string) || previewModalTemplate.defaultSubject
                }
                body={
                  (draft[previewModalTemplate.bodyField] as string) || previewModalTemplate.defaultBody
                }
                starColor={draft.bottom_star_color || '#FBBF24'}
                storeName={storeName}
                supportEmail={supportEmail}
                senderEmail={senderEmail}
                mode="email"
                device="desktop"
              />
            </div>

            <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Preview mode using store branding</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreviewModalTemplate(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const k = previewModalTemplate.key
                    setPreviewModalTemplate(null)
                    onEditTemplate(k)
                  }}
                  className="h-8 text-xs font-semibold cursor-pointer"
                >
                  Customize Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

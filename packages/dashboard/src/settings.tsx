import { PageHeader, usePermissions } from '@spree/dashboard-core'
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
import { Link } from '@tanstack/react-router'
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

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
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
          <Card>
            <CardHeader>
              <CardTitle>General Policies</CardTitle>
              <CardDescription>
                Control review visibility, moderation approval, and purchase verification rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submitted &amp; Published Review Editing</CardTitle>
              <CardDescription>
                Control which fields and attachments customers may modify when updating a previously
                submitted review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos &amp; Video Media Uploads</CardTitle>
              <CardDescription>
                Configure customer photo and video upload allowances and size ceilings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spam Filtering &amp; Content Safety</CardTitle>
              <CardDescription>
                Automatic spam detection, URL blocking, reporting thresholds, and rate limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
          </Card>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Submission Flow</CardTitle>
              <CardDescription>
                Choose how customers submit reviews and questionnaire answers in the storefront
                modal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Incentivized Reviews &amp; Gift Card Rewards</CardTitle>
              <CardDescription>
                Automatically reward approved photo and video reviews with a store Gift Card.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
          </Card>

          {!isMultiStep && (
            <Card>
              <CardHeader>
                <CardTitle>Single-Page Form Settings</CardTitle>
                <CardDescription>
                  Customize headers displayed inside the single-page review modal.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </Card>
          )}
        </div>
      )}

      {activeTab === 'customisation' && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Step Wizard Copy</CardTitle>
              <CardDescription>
                Customize titles, helper subtitles, and placeholders shown across all 4 wizard
                steps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Single-Page Modal Labels</CardTitle>
              <CardDescription>Applies when Single-Page Form mode is active.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize storefront star colors, Verified Purchase badge color, and label formatting
                across product headers, product cards, and review sections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search Engine Snippet &amp; Schema Markup</CardTitle>
              <CardDescription>
                Configure Schema.org Product structured data (JSON-LD) for Google Rich Snippets,
                star ratings, price, stock, and delivery badges in Google Search.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
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
                    Days until offer price expiration.
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
                    Schema.org condition specification.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Max Reviews in Schema</Label>
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
                    Number of approved reviews in payload.
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
                    <span className="truncate">handcrafted-wall-art-test</span>
                  </div>

                  {/* Title Link */}
                  <div className="text-base text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer">
                    Handcrafted Wall Art Test - Premium Canvas Artwork
                  </div>

                  {/* Rich Snippet Details Line */}
                  {draft.schema_markup_enabled !== false && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground py-0.5">
                      {draft.schema_include_aggregate_rating !== false && (
                        <div className="flex items-center gap-1 font-medium text-foreground">
                          <span style={{ color: draft.title_star_color || '#FBBF24' }}>
                            ★★★★★
                          </span>
                          <span>Rating: 4.8 · ‎120 reviews</span>
                        </div>
                      )}
                      {draft.schema_include_offers !== false && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-foreground">₹2,900.00</span>
                          <span>·</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
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
                    </div>
                  )}

                  {/* Snippet Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    Handcrafted premium quality wall art with detailed textures and rich colors. Read verified customer reviews and ratings, see customer photos, and shop online with fast delivery.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'marketing' && (
        <ReviewMarketingSettingsTab
          draft={draft}
          canEdit={canEdit}
          storeId={storeId}
          updateField={updateField}
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

interface ReviewEmailTemplateInfo {
  id: string
  name: string
  description: string
  subject: string
  previewText: string
}

const REVIEW_EMAIL_TEMPLATES: ReviewEmailTemplateInfo[] = [
  {
    id: 'spree.product_review_mailer.review_posted_email',
    name: 'Review Posted',
    description: 'Sent to customers immediately after they submit a new product review.',
    subject: '{{ store.name }} - Thank you for reviewing {{ review.product_name }}',
    previewText:
      'Thank you for your feedback! We have received your 5-star review for Handcrafted Wall Art Test.',
  },
  {
    id: 'spree.product_review_mailer.review_approved_email',
    name: 'Review Approved',
    description: 'Sent to the customer when moderation approves their review and makes it live.',
    subject: '{{ store.name }} - Your review on {{ review.product_name }} is live!',
    previewText:
      'Great news! Your 5-star review for Handcrafted Wall Art Test has been approved and is now live on our store.',
  },
  {
    id: 'spree.product_review_mailer.review_rejected_email',
    name: 'Review Rejected',
    description: 'Sent to the customer if their review does not meet store guidelines.',
    subject: '{{ store.name }} - Update regarding your review on {{ review.product_name }}',
    previewText:
      'Thank you for submitting a review. Unfortunately, your review could not be published because it did not meet our guidelines.',
  },
  {
    id: 'spree.product_review_mailer.review_spam_email',
    name: 'Review Spam',
    description: 'Sent when a review is flagged as spam by automated or manual moderation.',
    subject: '{{ store.name }} - Notice regarding your review',
    previewText: 'Your recent review was automatically flagged by our spam filter and removed.',
  },
  {
    id: 'spree.product_review_mailer.review_deleted_email',
    name: 'Review Deleted',
    description: 'Sent to the customer when their existing review is removed or deleted.',
    subject: '{{ store.name }} - Your review on {{ review.product_name }} has been removed',
    previewText: 'Your review for Handcrafted Wall Art Test has been removed from our store.',
  },
  {
    id: 'spree.product_review_mailer.solicit_review_email',
    name: 'Collect Review on Purchase',
    description: 'Sent to customers after delivery to invite them to review their purchased products.',
    subject: '{{ store.name }} - How do you like your recent purchase?',
    previewText:
      'How did we do? Thank you for your recent purchase of Handcrafted Wall Art Test! We would love to hear your thoughts.',
  },
]

function ReviewMarketingSettingsTab({
  draft,
  canEdit,
  storeId,
  updateField,
}: {
  draft: ReviewSettings
  canEdit: boolean
  storeId: string
  updateField: <K extends keyof ReviewSettings>(key: K, value: ReviewSettings[K]) => void
}) {
  const [previewTemplate, setPreviewTemplate] = useState<ReviewEmailTemplateInfo | null>(null)
  const emailsEnabled = draft.send_review_emails_to_customers !== false

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Email Notifications</CardTitle>
          <CardDescription>
            Configure automated transactional email notifications sent to customers throughout the review lifecycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                label="Review Approved & Published Notification"
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
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Spree native Liquid and MJML email templates. Edit copy, add variables, and preview formatting.
              </CardDescription>
            </div>
            <Link
              to="/$storeId/settings/emails/templates"
              params={{ storeId }}
              className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
            >
              View all store email templates →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {REVIEW_EMAIL_TEMPLATES.map((tmpl) => (
              <li
                key={tmpl.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{tmpl.name}</span>
                    <Badge variant="outline" className="text-[10px] font-normal uppercase py-0 px-1.5">
                      Default
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                  <p className="text-xs font-mono text-muted-foreground/80 line-clamp-1">{tmpl.subject}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs cursor-pointer"
                    onClick={() => setPreviewTemplate(tmpl)}
                  >
                    Quick Preview
                  </Button>
                  <Link
                    to="/$storeId/settings/emails/templates/$templateId"
                    params={{ storeId, templateId: tmpl.id }}
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs font-medium transition-colors"
                  >
                    Customize in Spree Editor ↗
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Quick Preview Modal */}
      {previewTemplate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="fixed inset-0" onClick={() => setPreviewTemplate(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-card border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b flex items-center justify-between bg-muted/40">
              <div>
                <h4 className="text-sm font-bold text-foreground m-0">{previewTemplate.name}</h4>
                <p className="text-xs text-muted-foreground m-0 font-mono mt-0.5">{previewTemplate.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="rounded-md bg-muted/30 p-3 space-y-1 text-xs">
                <span className="font-semibold text-muted-foreground">Subject Preview:</span>
                <p className="font-mono text-foreground">{previewTemplate.subject}</p>
              </div>

              <div className="rounded-lg border bg-background p-6 space-y-4 shadow-xs">
                <div className="border-b pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Artolika.Inc Store
                  </span>
                </div>
                <div className="space-y-2">
                  <h5 className="text-base font-bold text-foreground m-0">{previewTemplate.name}</h5>
                  <p className="text-sm text-foreground/90 leading-relaxed">{previewTemplate.previewText}</p>
                </div>
                <div className="pt-2">
                  <div className="inline-block rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-xs">
                    View on Storefront
                  </div>
                </div>
                <div className="border-t pt-4 text-[11px] text-muted-foreground">
                  <p>© 2026 Artolika.Inc. All rights reserved.</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Preview mode using sample data</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(null)}>
                  Close
                </Button>
                <Link
                  to="/$storeId/settings/emails/templates/$templateId"
                  params={{ storeId, templateId: previewTemplate.id }}
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs font-medium transition-colors"
                >
                  Edit in Spree Editor ↗
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

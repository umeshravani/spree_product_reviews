import { PageHeader } from '@spree/dashboard-core'
import {
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
import { Check, Loader2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { productReviewsClient } from '../client'
import type { ProductReviewsSettings } from '../types'

export function ProductReviewsSettingsPage() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<ProductReviewsSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)

    productReviewsClient
      .getSettings()
      .then((data) => {
        if (isMounted) {
          setSettings(data)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load settings')
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setError(null)
    setSavedSuccess(false)

    try {
      const updated = await productReviewsClient.updateSettings(settings)
      setSettings(updated)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof ProductReviewsSettings>(
    key: K,
    value: ProductReviewsSettings[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Product Reviews Settings"
          description="Configure customer feedback moderation, spam rules, and display settings."
        />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <PageHeader
        title="Product Reviews Settings"
        description="Configure customer feedback moderation, spam rules, and display settings."
        actions={
          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4" />
                Settings saved
              </span>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !settings}
              className="flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save changes
            </Button>
          </div>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/15 text-destructive border border-destructive/20 text-sm">
          {error}
        </div>
      )}

      {settings && (
        <div className="space-y-6">
          {/* General Policies */}
          <Card>
            <CardHeader>
              <CardTitle>General Policies</CardTitle>
              <CardDescription>
                Control review visibility, submissions, and verification rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="review-enabled" className="text-sm font-medium">
                    Enable Product Reviews
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow customers to view and submit reviews on product pages.
                  </p>
                </div>
                <Switch
                  id="review-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(val) => updateField('enabled', val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="review-approval" className="text-sm font-medium">
                    Require Approval
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Reviews must be approved by store staff before appearing publicly.
                  </p>
                </div>
                <Switch
                  id="review-approval"
                  checked={settings.require_approval}
                  onCheckedChange={(val) => updateField('require_approval', val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="review-anonymous" className="text-sm font-medium">
                    Allow Anonymous / Guest Reviews
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Permit reviews without requiring an authenticated customer account.
                  </p>
                </div>
                <Switch
                  id="review-anonymous"
                  checked={settings.allow_anonymous}
                  onCheckedChange={(val) => updateField('allow_anonymous', val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="review-unverified" className="text-sm font-medium">
                    Allow Unverified Purchasers
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Permit reviews from users who have not purchased this item.
                  </p>
                </div>
                <Switch
                  id="review-unverified"
                  checked={settings.allow_unverified}
                  onCheckedChange={(val) => updateField('allow_unverified', val)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Spam & Safety */}
          <Card>
            <CardHeader>
              <CardTitle>Spam Filtering & Content Safety</CardTitle>
              <CardDescription>
                Automatic detection and link controls to prevent abuse.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="review-spam-block" className="text-sm font-medium">
                    Automatic Spam Detection
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically flag suspicious repetitive submissions as spam.
                  </p>
                </div>
                <Switch
                  id="review-spam-block"
                  checked={settings.block_spam_reviews}
                  onCheckedChange={(val) => updateField('block_spam_reviews', val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="review-links" className="text-sm font-medium">
                    Block External Links & URLs
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Reject or flag reviews containing hyperlinks.
                  </p>
                </div>
                <Switch
                  id="review-links"
                  checked={settings.disable_review_links}
                  onCheckedChange={(val) => updateField('disable_review_links', val)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-spam-words" className="text-sm font-medium">
                  Blocked Keywords & Spam Terms
                </Label>
                <Textarea
                  id="review-spam-words"
                  placeholder="e.g. buy now, discount code, casino (comma separated)"
                  value={settings.spam_words || ''}
                  onChange={(e) => updateField('spam_words', e.target.value)}
                  className="h-24 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Submissions containing any of these words will be automatically routed to moderation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="review-reports-threshold" className="text-sm font-medium">
                    Report Moderation Threshold
                  </Label>
                  <Input
                    id="review-reports-threshold"
                    type="number"
                    min={1}
                    max={50}
                    value={settings.report_moderation_threshold || 3}
                    onChange={(e) =>
                      updateField('report_moderation_threshold', parseInt(e.target.value, 10) || 3)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of customer reports before a review is hidden for review.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-max-images" className="text-sm font-medium">
                    Max Media / Photos per Review
                  </Label>
                  <Input
                    id="review-max-images"
                    type="number"
                    min={1}
                    max={10}
                    value={settings.max_images_upload || 5}
                    onChange={(e) =>
                      updateField('max_images_upload', parseInt(e.target.value, 10) || 5)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of attachments allowed per review (1-10).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission Experience & Modal Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Review Submission Experience</CardTitle>
              <CardDescription>
                Choose between a guided multi-step wizard or a clean single-page form.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="review-modal-mode" className="text-sm font-medium">
                    Submission Flow
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Multi-step wizard guides users through rating, media upload with discount incentives, and feedback.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('modal_mode', 'multi')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      (settings.modal_mode || 'multi') === 'multi'
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    Multi-Step Wizard
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('modal_mode', 'single')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      settings.modal_mode === 'single'
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    Single-Page Form
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Incentivized Reviews & Gift Card Rewards */}
          <Card>
            <CardHeader>
              <CardTitle>Incentivized Reviews & Gift Card Rewards</CardTitle>
              <CardDescription>
                Reward customers who upload photos or videos with automatic Gift Cards upon approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="review-rewards-enabled" className="text-sm font-medium">
                    Enable Automatic Gift Card Rewards
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically issue and assign a gift card to the customer account when their media review is approved.
                  </p>
                </div>
                <Switch
                  id="review-rewards-enabled"
                  checked={settings.rewards_enabled ?? true}
                  onCheckedChange={(val) => updateField('rewards_enabled', val)}
                />
              </div>

              {/* Photo Reward */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Photo Review Reward</Label>
                    <p className="text-xs text-muted-foreground">Reward customers uploading high-quality photos.</p>
                  </div>
                  <Switch
                    checked={settings.photo_reward_enabled ?? true}
                    onCheckedChange={(val) => updateField('photo_reward_enabled', val)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Discount Percentage (%)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.photo_reward_percentage ?? 15}
                      onChange={(e) => updateField('photo_reward_percentage', parseInt(e.target.value, 10) || 15)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Gift Card Amount</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={settings.photo_reward_amount ?? 150}
                      onChange={(e) => updateField('photo_reward_amount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Display Headline</Label>
                    <Input
                      value={settings.photo_reward_text || 'Get 15% off your next purchase'}
                      onChange={(e) => updateField('photo_reward_text', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Video Reward */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Video Review Reward</Label>
                    <p className="text-xs text-muted-foreground">Reward customers uploading demonstration or unboxing videos.</p>
                  </div>
                  <Switch
                    checked={settings.video_reward_enabled ?? true}
                    onCheckedChange={(val) => updateField('video_reward_enabled', val)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Discount Percentage (%)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.video_reward_percentage ?? 20}
                      onChange={(e) => updateField('video_reward_percentage', parseInt(e.target.value, 10) || 20)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Gift Card Amount</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={settings.video_reward_amount ?? 200}
                      onChange={(e) => updateField('video_reward_amount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Display Headline</Label>
                    <Input
                      value={settings.video_reward_text || 'Get 20% off your next purchase'}
                      onChange={(e) => updateField('video_reward_text', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Multi-Step Wizard Customizable Titles */}
          <Card>
            <CardHeader>
              <CardTitle>Multi-Step Wizard Content Customization</CardTitle>
              <CardDescription>
                Customize each step title, description, and interactive labels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs font-medium">Step 1 Title</Label>
                  <Input
                    value={settings.step1_title || 'How would you rate this item?'}
                    onChange={(e) => updateField('step1_title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs font-medium">Step 1 Dislike Label</Label>
                  <Input
                    value={settings.step1_dislike_label || 'Dislike it'}
                    onChange={(e) => updateField('step1_dislike_label', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs font-medium">Step 1 Love Label</Label>
                  <Input
                    value={settings.step1_love_label || 'Love it!'}
                    onChange={(e) => updateField('step1_love_label', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Step 2 Title (Show it off)</Label>
                  <Input
                    value={settings.step2_title || 'Show it off'}
                    onChange={(e) => updateField('step2_title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Step 2 Subtitle</Label>
                  <Input
                    value={settings.step2_subtitle || "We'd love to see it in action!"}
                    onChange={(e) => updateField('step2_subtitle', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Step 3 Title (Tell us more)</Label>
                  <Input
                    value={settings.step3_title || 'Tell us more!'}
                    onChange={(e) => updateField('step3_title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Step 3 Placeholder</Label>
                  <Input
                    value={settings.step3_placeholder || 'Share your experience'}
                    onChange={(e) => updateField('step3_placeholder', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Step 4 Confirmation Title</Label>
                  <Input
                    value={settings.step4_title || 'Thank you for posting!'}
                    onChange={(e) => updateField('step4_title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Step 4 Confirmation Subtitle</Label>
                  <Input
                    value={settings.step4_subtitle || 'Your feedback helps others make better choices.'}
                    onChange={(e) => updateField('step4_subtitle', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Title Rating Header Display */}
          <Card>
            <CardHeader>
              <CardTitle>Product Title Star Rating Header</CardTitle>
              <CardDescription>
                Customize appearance of the rating snippet displayed beneath product titles on PDP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Star Color (Hex / Name)</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.title_star_color || '#000000'}
                      onChange={(e) => updateField('title_star_color', e.target.value)}
                      className="w-9 h-9 rounded cursor-pointer border border-border p-0.5"
                    />
                    <Input
                      value={settings.title_star_color || '#000000'}
                      onChange={(e) => updateField('title_star_color', e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Rating Display Format</Label>
                  <Input
                    value={settings.title_rating_format || '{rating}/5 {count}+ reviews'}
                    onChange={(e) => updateField('title_rating_format', e.target.value)}
                    placeholder="{rating}/5 {count}+ reviews"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Reviews Label</Label>
                  <Input
                    value={settings.title_reviews_label || 'reviews'}
                    onChange={(e) => updateField('title_reviews_label', e.target.value)}
                    placeholder="reviews"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

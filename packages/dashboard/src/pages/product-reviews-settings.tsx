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
  const [activeTab, setActiveTab] = useState<'general' | 'settings' | 'customisation'>('general')
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
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const isMultiStep = (settings?.modal_mode || 'multi') === 'multi'
  const rewardsEnabled = settings?.rewards_enabled ?? true

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <PageHeader
        title="Product Reviews Settings"
        description="Configure customer feedback moderation, incentives, and display settings."
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

      {/* Production Spree Grade Tablist */}
      <div
        data-orientation="horizontal"
        data-activation-direction="left"
        role="tablist"
        data-slot="tabs-list"
        className="inline-flex w-fit items-center justify-center gap-1 rounded-lg bg-muted/60 p-1 text-muted-foreground"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'general'}
          onClick={() => setActiveTab('general')}
          className={`inline-flex min-h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none ${
            activeTab === 'general'
              ? 'bg-background text-foreground shadow-xs'
              : 'hover:text-foreground text-muted-foreground'
          }`}
        >
          General
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
          className={`inline-flex min-h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none ${
            activeTab === 'settings'
              ? 'bg-background text-foreground shadow-xs'
              : 'hover:text-foreground text-muted-foreground'
          }`}
        >
          Settings
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'customisation'}
          onClick={() => setActiveTab('customisation')}
          className={`inline-flex min-h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none ${
            activeTab === 'customisation'
              ? 'bg-background text-foreground shadow-xs'
              : 'hover:text-foreground text-muted-foreground'
          }`}
        >
          Customisation
        </button>
      </div>

      {settings && (
        <div className="space-y-6">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <>
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

              {/* Spam Filtering & Content Safety */}
              <Card>
                <CardHeader>
                  <CardTitle>Spam Filtering &amp; Content Safety</CardTitle>
                  <CardDescription>
                    Automatic detection and abuse prevention rules.
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
                        Block External Links &amp; URLs
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
                      Blocked Keywords &amp; Spam Terms
                    </Label>
                    <Textarea
                      id="review-spam-words"
                      placeholder="e.g. buy now, discount code, casino (comma separated)"
                      value={settings.spam_words || ''}
                      onChange={(e) => updateField('spam_words', e.target.value)}
                      className="h-20 resize-none"
                    />
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* TAB 2: SETTINGS (FLOW & REWARDS) */}
          {activeTab === 'settings' && (
            <>
              {/* Submission Experience */}
              <Card>
                <CardHeader>
                  <CardTitle>Submission Flow</CardTitle>
                  <CardDescription>
                    Select the customer submission workflow.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Modal Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        {isMultiStep
                          ? 'Multi-Step Wizard guides users step-by-step with rewards.'
                          : 'Single-Page Form renders all fields in one modal.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateField('modal_mode', 'multi')}
                        style={
                          isMultiStep
                            ? {
                                backgroundColor: 'var(--brand-blue-strong, #2563eb)',
                                color: '#ffffff',
                                borderColor: 'var(--brand-blue-strong, #2563eb)',
                              }
                            : undefined
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isMultiStep
                            ? 'shadow-xs font-bold'
                            : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        Multi-Step Wizard
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('modal_mode', 'single')}
                        style={
                          !isMultiStep
                            ? {
                                backgroundColor: 'var(--brand-blue-strong, #2563eb)',
                                color: '#ffffff',
                                borderColor: 'var(--brand-blue-strong, #2563eb)',
                              }
                            : undefined
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          !isMultiStep
                            ? 'shadow-xs font-bold'
                            : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        Single-Page Form
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Multi-Step Incentives & Rewards (Only shown when Multi-Step selected) */}
              {isMultiStep && (
                <Card>
                  <CardHeader>
                    <CardTitle>Incentivized Reviews &amp; Rewards</CardTitle>
                    <CardDescription>
                      Configure photo and video discount incentives for customer reviews.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="review-rewards-enabled" className="text-sm font-medium">
                          Enable Automatic Gift Card Rewards
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Issue a Gift Card when an approved customer review includes photos or video.
                        </p>
                      </div>
                      <Switch
                        id="review-rewards-enabled"
                        checked={rewardsEnabled}
                        onCheckedChange={(val) => updateField('rewards_enabled', val)}
                      />
                    </div>

                    {/* Only show Photo & Video reward cards if rewards are enabled */}
                    {rewardsEnabled && (
                      <>
                        {/* Photo Reward */}
                        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-semibold">Photo Review Reward</Label>
                              <p className="text-xs text-muted-foreground">Reward customers uploading photos.</p>
                            </div>
                            <Switch
                              checked={settings.photo_reward_enabled ?? true}
                              onCheckedChange={(val) => updateField('photo_reward_enabled', val)}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Discount (%)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={settings.photo_reward_percentage ?? 15}
                                onChange={(e) => updateField('photo_reward_percentage', parseInt(e.target.value, 10) || 15)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Gift Card Amount (₹)</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={settings.photo_reward_amount ?? 150}
                                onChange={(e) => updateField('photo_reward_amount', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Promotion Code / ID</Label>
                              <Input
                                placeholder="e.g. PHOTO15"
                                value={settings.photo_reward_promotion_id || ''}
                                onChange={(e) => updateField('photo_reward_promotion_id', e.target.value)}
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
                              <p className="text-xs text-muted-foreground">Reward customers uploading video reviews.</p>
                            </div>
                            <Switch
                              checked={settings.video_reward_enabled ?? true}
                              onCheckedChange={(val) => updateField('video_reward_enabled', val)}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Discount (%)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={settings.video_reward_percentage ?? 20}
                                onChange={(e) => updateField('video_reward_percentage', parseInt(e.target.value, 10) || 20)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Gift Card Amount (₹)</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={settings.video_reward_amount ?? 200}
                                onChange={(e) => updateField('video_reward_amount', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Promotion Code / ID</Label>
                              <Input
                                placeholder="e.g. VIDEO20"
                                value={settings.video_reward_promotion_id || ''}
                                onChange={(e) => updateField('video_reward_promotion_id', e.target.value)}
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
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Single Page Form Settings (Only shown when Single-Page Form selected) */}
              {!isMultiStep && (
                <Card>
                  <CardHeader>
                    <CardTitle>Single-Page Form Settings</CardTitle>
                    <CardDescription>
                      Configure headers and field text for the single-page modal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Form Title</Label>
                        <Input
                          value={settings.single_form_title || 'Write a review'}
                          onChange={(e) => updateField('single_form_title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Form Description</Label>
                        <Input
                          value={settings.single_form_description || 'Share your feedback for this product'}
                          onChange={(e) => updateField('single_form_description', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* TAB 3: CUSTOMISATION */}
          {activeTab === 'customisation' && (
            <>
              {/* Multi-Step Wizard Content (Only when Multi-Step selected) */}
              {isMultiStep && (
                <Card>
                  <CardHeader>
                    <CardTitle>Wizard Steps Content</CardTitle>
                    <CardDescription>
                      Customize titles and labels across the submission steps.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Step 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5 sm:col-span-1">
                        <Label className="text-xs font-medium">Step 1 Title</Label>
                        <Input
                          value={settings.step1_title || 'How would you rate this item?'}
                          onChange={(e) => updateField('step1_title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-1">
                        <Label className="text-xs font-medium">Dislike Label</Label>
                        <Input
                          value={settings.step1_dislike_label || 'Dislike it'}
                          onChange={(e) => updateField('step1_dislike_label', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-1">
                        <Label className="text-xs font-medium">Love Label</Label>
                        <Input
                          value={settings.step1_love_label || 'Love it!'}
                          onChange={(e) => updateField('step1_love_label', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Step 2 Title</Label>
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

                    {/* Step 3 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Step 3 Title</Label>
                        <Input
                          value={settings.step3_title || 'Tell us more!'}
                          onChange={(e) => updateField('step3_title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Placeholder</Label>
                        <Input
                          value={settings.step3_placeholder || 'Share your experience'}
                          onChange={(e) => updateField('step3_placeholder', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Confirmation Title</Label>
                        <Input
                          value={settings.step4_title || 'Thank you for posting!'}
                          onChange={(e) => updateField('step4_title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Confirmation Subtitle</Label>
                        <Input
                          value={settings.step4_subtitle || 'Your feedback helps others make better choices.'}
                          onChange={(e) => updateField('step4_subtitle', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Star Rating Colors & Appearance */}
              <Card>
                <CardHeader>
                  <CardTitle>Rating Display &amp; Star Colors</CardTitle>
                  <CardDescription>
                    Customize the colors and formats of review stars on product pages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Header Star Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.title_star_color || '#000000'}
                          onChange={(e) => updateField('title_star_color', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-border p-0.5"
                        />
                        <Input
                          value={settings.title_star_color || '#000000'}
                          onChange={(e) => updateField('title_star_color', e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Bottom Reviews Star Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.bottom_star_color || '#FBBF24'}
                          onChange={(e) => updateField('bottom_star_color', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-border p-0.5"
                        />
                        <Input
                          value={settings.bottom_star_color || '#FBBF24'}
                          onChange={(e) => updateField('bottom_star_color', e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Header Format</Label>
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
            </>
          )}
        </div>
      )}
    </div>
  )
}

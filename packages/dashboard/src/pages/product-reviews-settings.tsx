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
        </div>
      )}
    </div>
  )
}

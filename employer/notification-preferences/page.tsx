'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/useLanguage'
import { useAuth } from '@/lib/auth'
import { ScrollReveal } from '@/components/animations/ScrollReveal'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Bell, Mail, Users } from 'lucide-react'
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/lib/db/notificationPreferences'
import type { NotificationPreferenceKey } from '@/lib/types'
import type { TranslationKey } from '@/lib/i18n'

interface PrefRow {
  key: NotificationPreferenceKey
  labelKey: TranslationKey
  descKey: TranslationKey
}

const EMPLOYER_PREFS: PrefRow[] = [
  { key: 'email_application_received',   labelKey: 'notif_prefs_email_application_received',   descKey: 'notif_prefs_email_application_received_desc' },
  { key: 'email_application_confirmed',  labelKey: 'notif_prefs_email_application_confirmed',  descKey: 'notif_prefs_email_application_confirmed_desc' },
  { key: 'email_job_filled',             labelKey: 'notif_prefs_email_job_filled',             descKey: 'notif_prefs_email_job_filled_desc' },
  { key: 'email_job_expired',            labelKey: 'notif_prefs_email_job_expired',            descKey: 'notif_prefs_email_job_expired_desc' },
]

export default function EmployerNotificationPreferencesPage() {
  const { t } = useLanguage()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [values, setValues] = useState<Record<NotificationPreferenceKey, boolean>>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  )
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const loadPrefs = useCallback(async () => {
    if (!user?.id) return
    setLoadingPrefs(true)
    const prefs = await getNotificationPreferences(user.id)
    if (prefs) {
      setValues({
        email_application_accepted:  prefs.email_application_accepted,
        email_application_rejected:  prefs.email_application_rejected,
        email_application_offered:   prefs.email_application_offered,
        email_application_hired:     prefs.email_application_hired,
        email_offer_expired:         prefs.email_offer_expired,
        email_job_offer:             prefs.email_job_offer,
        email_job_offer_withdrawn:   prefs.email_job_offer_withdrawn,
        email_position_filled:       prefs.email_position_filled,
        email_job_cancelled:         prefs.email_job_cancelled,
        email_application_received:  prefs.email_application_received,
        email_application_confirmed: prefs.email_application_confirmed,
        email_job_filled:            prefs.email_job_filled,
        email_job_expired:           prefs.email_job_expired,
      })
    }
    setLoadingPrefs(false)
  }, [user?.id])

  useEffect(() => {
    loadPrefs()
  }, [loadPrefs])

  const toggle = (key: NotificationPreferenceKey) => {
    setValues(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    setSuccessMessage('')
    setErrorMessage('')
    const result = await upsertNotificationPreferences(user.id, values)
    if (result) {
      setSuccessMessage(t('notif_prefs_saved') || 'Preferences saved successfully!')
    } else {
      setErrorMessage(t('notif_prefs_save_failed') || 'Failed to save preferences. Please try again.')
    }
    setSaving(false)
  }

  if (authLoading || loadingPrefs) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-71px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-blue-100 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm font-medium text-slate-500">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-[calc(100vh-71px)] bg-slate-50 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 pb-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-200/30 via-blue-100/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-100/30 via-purple-50/20 to-transparent rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgb(59, 130, 246) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
          <ScrollReveal variant="fade-up" delay={0}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
                <Bell className="w-4 h-4" />
                {t('notification_preferences')}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                {t('notification_preferences')}
              </h1>
              <p className="text-lg text-slate-600 max-w-xl mx-auto">
                {t('notif_prefs_description')}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Main Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 pb-16">

        {successMessage && (
          <ScrollReveal variant="fade-up" delay={0}>
            <div className="mb-6">
              <Alert type="success" message={successMessage} onClose={() => setSuccessMessage('')} />
            </div>
          </ScrollReveal>
        )}
        {errorMessage && (
          <ScrollReveal variant="fade-up" delay={0}>
            <div className="mb-6">
              <Alert type="error" message={errorMessage} onClose={() => setErrorMessage('')} />
            </div>
          </ScrollReveal>
        )}

        <div className="space-y-4">
          {/* Employer preferences card */}
          <ScrollReveal variant="fade-up" delay={100}>
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 overflow-hidden">
              <div className="flex items-center gap-4 p-6 border-b border-slate-100">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {t('notif_prefs_employer_section')}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    <Mail className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                    {t('notif_prefs_email_notifications')}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-50">
                {EMPLOYER_PREFS.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium text-slate-800">{t(row.labelKey)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t(row.descKey)}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={values[row.key]}
                      onClick={() => toggle(row.key)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        values[row.key] ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          values[row.key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Save Button */}
          <ScrollReveal variant="fade-up" delay={200}>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} isLoading={saving}>
                {saving
                  ? (t('saving') || 'Saving...')
                  : (t('save_preferences') || 'Save Preferences')}
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { translateCountryCode } from '@/lib/utils/countryTranslation'
import { getJobPostingById, applyToJobAtomic, getWorkerProfile, getApplicationsByWorker } from '@/lib/db'
import type { JobPosting, WorkerProfile } from '@/lib/types'
import Navbar from '@/components/Navbar'
import {
  Briefcase,
  MapPin,
  Calendar,
  Euro,
  Home,
  Utensils,
  CheckCircle2,
  Building2,
  ArrowLeft,
  Languages,
  Mail
} from 'lucide-react'
import dynamic from 'next/dynamic'
const CompleteProfileModal = dynamic(() => import('@/components/onboarding/CompleteProfileModal').then(m => ({ default: m.CompleteProfileModal })), { ssr: false })
const ApplyJobModal = dynamic(() => import('@/components/worker/ApplyJobModal').then(m => ({ default: m.ApplyJobModal })), { ssr: false })
import { FlagIcon } from '@/components/ui/FlagIcon'

const isProfileComplete = (profile: WorkerProfile | null): boolean => {
  if (!profile) return false
  return !!(
    profile.full_name &&
    profile.full_name.trim().length > 0 &&
    profile.work_types &&
    profile.work_types.length > 0
  )
}

interface JobDetailClientProps {
  jobId: string
  initialJob: JobPosting | null
}

export default function JobDetailClient({ jobId, initialJob }: JobDetailClientProps) {
  const { user, role, loading: authLoading } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()

  const [job, setJob] = useState<JobPosting | null>(initialJob)
  const [loading, setLoading] = useState(!initialJob)
  const [applying, setApplying] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [ownApplicationStatus, setOwnApplicationStatus] = useState<string | undefined>(undefined)
  const [offerStatus, setOfferStatus] = useState<string | undefined>(undefined)
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [pendingJobTitle, setPendingJobTitle] = useState<string | undefined>(undefined)
  const [translations, setTranslations] = useState<Record<'title' | 'description', { text: string; loading: boolean; error: boolean; visible: boolean } | null>>({
    title: null,
    description: null,
  })

  useEffect(() => {
    if (authLoading) return

    // Redirect employers to their own jobs page
    if (user && role === 'employer') {
      router.push('/employer/jobs')
      return
    }

    if (user && role === 'worker' && jobId) {
      loadUserData()
    }
    // If no user, we still show the job (public view) but load nothing
    if (!initialJob && jobId) {
      loadJobData()
    }
  }, [user, role, authLoading, jobId])

  const loadJobData = async () => {
    setLoading(true)
    const jobData = await getJobPostingById(jobId)
    if (jobData) setJob(jobData)
    setLoading(false)
  }

  const loadUserData = async () => {
    if (!user) return
    setLoading(true)

    const jobData = job ?? await getJobPostingById(jobId)
    if (!jobData) {
      setLoading(false)
      return
    }
    if (!job) setJob(jobData)

    const profile = await getWorkerProfile(user.id)
    setWorkerProfile(profile)

    if (profile) {
      const applications = await getApplicationsByWorker(profile.id)
      // Only mark as "applied" if the worker actually applied (not employer-initiated offers)
      const ownApp = applications.find(app => (app as any).origin !== 'direct_offer' && app.job_id === jobId)
      setHasApplied(!!ownApp)
      setOwnApplicationStatus(ownApp?.status)
      // Check if employer sent a direct offer for this job and get its status
      const directOffer = applications.find(app => (app as any).origin === 'direct_offer' && app.job_id === jobId)
      setOfferStatus(directOffer?.status)
    }

    setLoading(false)
  }

  const handleApply = () => {
    if (!user) {
      router.push(`/login?redirect=/worker/jobs/${jobId}`)
      return
    }
    if (!job || !jobId) return

    if (!isProfileComplete(workerProfile)) {
      localStorage.setItem('pending_job_application', jobId)
      setPendingJobTitle(job.title)
      setShowProfileModal(true)
      return
    }

    setShowApplyModal(true)
  }

  const handleApplyWithMessage = async (message: string) => {
    if (!user || !job || !jobId || !workerProfile) return

    setApplying(true)

    const result = await applyToJobAtomic(jobId, workerProfile.id, message)
    if (result.success) {
      posthog.capture('job_application_submitted', {
        job_id: jobId,
        job_title: job.title,
        work_type: job.work_type,
      })
      setHasApplied(true)
      setShowApplyModal(false)
      alert(t('application_successful'))
    } else {
      if (result.error === 'already_applied') {
        // Worker already has an active application (possibly a direct offer)
        setOfferStatus('offered')
        setShowApplyModal(false)
      } else {
        const errorMsg = result.error === 'no_positions_available' ? t('error_no_positions_available' as any)
          : result.error === 'job_not_active' ? t('error_job_not_active' as any)
          : result.error === 'previously_declined' ? (t('offer_declined_no_reapply') || 'You cannot re-apply to this position.')
          : result.error === 'rate_limit_exceeded' ? t('error_rate_limit_exceeded' as any)
          : t('error_generic_offer' as any) || 'Failed to apply. You may have already applied.'
        alert(errorMsg)
      }
    }
    setApplying(false)
  }

  const handleTranslate = async (field: 'title' | 'description', content: string) => {
    const current = translations[field]

    if (current?.text && current.visible) {
      setTranslations(prev => ({ ...prev, [field]: { ...current, visible: false } }))
      return
    }

    if (current?.text && !current.visible) {
      setTranslations(prev => ({ ...prev, [field]: { ...current, visible: true } }))
      return
    }

    setTranslations(prev => ({ ...prev, [field]: { text: '', loading: true, error: false, visible: false } }))

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, targetLang: language }),
      })

      if (!response.ok) throw new Error('Translation failed')

      const data = await response.json()
      setTranslations(prev => ({ ...prev, [field]: { text: data.translatedText, loading: false, error: false, visible: true } }))
    } catch {
      setTranslations(prev => ({ ...prev, [field]: { text: '', loading: false, error: true, visible: false } }))
    }
  }

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </>
    )
  }

  if (!job) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('job_not_found')}</h1>
            <p className="text-slate-600 mb-4">{t('go_back_to_jobs')}</p>
            <Link
              href="/worker/jobs"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-semibold hover:shadow-md transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('go_back_to_jobs')}
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-50">
      <Navbar />
      <CompleteProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        jobTitle={pendingJobTitle}
      />
      <ApplyJobModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onApply={handleApplyWithMessage}
        job={job}
        applying={applying}
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-10">
        <div className="md:hidden" style={{ height: '88px' }} aria-hidden="true" />
        <div className="sm:pt-8">
        {/* Back Button */}
        <Link
          href="/worker/jobs"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">{t('go_back_to_jobs') || 'Back to Jobs'}</span>
        </Link>

        {/* Job Card */}
        <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
                {translations.title?.visible ? translations.title.text : job.title}
              </h1>
              <button
                onClick={() => handleTranslate('title', job.title)}
                disabled={translations.title?.loading}
                className="flex items-center gap-1 mb-3 text-xs text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-50"
              >
                <Languages className="w-3 h-3" />
                <span>
                  {translations.title?.loading
                    ? t('translating')
                    : translations.title?.error
                      ? t('translation_failed')
                      : translations.title?.visible
                        ? t('show_original')
                        : t('translate')}
                </span>
              </button>
              <Link 
                href={`/employer/view-profile?id=${job.employer_id}`}
                className="inline-flex items-center gap-2 text-lg text-slate-600 font-medium hover:text-blue-600 transition-colors mb-2"
              >
                <Building2 className="w-5 h-5" />
                {job.company_name}
              </Link>
              {job.location_city && (
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location_city}
                  {job.location_country && `, ${translateCountryCode(job.location_country, language)}`}
                  {job.location_address && <span className="text-slate-400">• {job.location_address}</span>}
                </p>
              )}
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Full Description */}
          <div className="mb-6 pb-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">{t('description')}</h2>
              <button
                onClick={() => handleTranslate('description', job.description)}
                disabled={translations.description?.loading}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-50"
              >
                <Languages className="w-3 h-3" />
                <span>
                  {translations.description?.loading
                    ? t('translating')
                    : translations.description?.error
                      ? t('translation_failed')
                      : translations.description?.visible
                        ? t('show_original')
                        : t('translate')}
                </span>
              </button>
            </div>
            <p className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
              {translations.description?.visible ? translations.description.text : job.description}
            </p>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Briefcase className="w-5 h-5" />
                <span className="text-sm font-medium">{t('work_type')}</span>
              </div>
              <p className="text-base font-semibold text-slate-900">{t(job.work_type)}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Euro className="w-5 h-5" />
                <span className="text-sm font-medium">{t('salary')}</span>
              </div>
              <p className="text-base font-semibold text-slate-900">
                {job.salary_range 
                  ? t(`salary_${job.salary_range}` as any) || job.salary_range.replace(/_/g, ' ')
                  : job.pay_netto && job.pay_netto > 0 
                    ? `€${job.pay_netto}/mo`
                    : job.pay_brutto && job.pay_brutto > 0
                      ? `€${job.pay_brutto}/mo (${t('brutto')})`
                      : t('salary_negotiable')}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-medium">{t('start_date')}</span>
              </div>
              <p className="text-base font-semibold text-slate-900">
                {new Date(job.start_date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">{t('experience')}</span>
              </div>
              <p className="text-base font-semibold text-slate-900">
                {job.years_of_experience === 0 || job.years_of_experience === undefined
                  ? t('no_experience_required')
                  : `${job.years_of_experience}+ ${t('years')}`}
              </p>
            </div>
          </div>

          {/* Benefits */}
          {(job.accommodation_included || job.food_included) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('benefits_perks')}</h3>
              <div className="flex flex-wrap gap-2">
                {job.accommodation_included && (
                  <span className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg font-medium text-sm border border-green-200">
                    <Home className="w-4 h-4" />
                    {t('accommodation_included')}
                  </span>
                )}
                {job.food_included && (
                  <span className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg font-medium text-sm border border-green-200">
                    <Utensils className="w-4 h-4" />
                    {t('food_included')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Language Requirements */}
          {job.language_requirements && job.language_requirements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('language_requirements') || 'Language Requirements'}</h3>
              <div className="flex flex-wrap gap-2">
                {job.language_requirements.map((lang) => {
                  const langDisplay: Record<string, { flag: string; name: string }> = {
                    en: { flag: 'gb', name: 'English' },
                    de: { flag: 'de', name: 'German' },
                    sr: { flag: 'rs', name: 'Serbian' },
                    hr: { flag: 'hr', name: 'Croatian' },
                    bs: { flag: 'ba', name: 'Bosnian' },
                    mk: { flag: 'mk', name: 'Macedonian' },
                    sl: { flag: 'si', name: 'Slovenian' },
                    pl: { flag: 'pl', name: 'Polish' },
                    bg: { flag: 'bg', name: 'Bulgarian' },
                    ro: { flag: 'ro', name: 'Romanian' },
                    el: { flag: 'gr', name: 'Greek' },
                    sq: { flag: 'al', name: 'Albanian' },
                    ar: { flag: 'sa', name: 'Arabic' },
                    uk: { flag: 'ua', name: 'Ukrainian' },
                  }
                  const langInfo = langDisplay[lang] || { flag: '', name: lang }
                  return (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm border border-blue-200"
                    >
                      {langInfo.flag && <FlagIcon code={langInfo.flag} />}
                      <span>{langInfo.name}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Apply Button / Offer Info */}
          <div className="pt-6 border-t border-slate-200 space-y-3">
            {(offerStatus === 'rejected' || (hasApplied && ownApplicationStatus === 'rejected')) ? (
              <>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{t('offer_declined_title')}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t('offer_declined_no_reapply')}</p>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/employer/view-profile?id=${job.employer_id}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm rounded-lg font-medium border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all duration-200"
                >
                  <Building2 className="w-4 h-4" />
                  {t('view_employer_profile')}
                </Link>
              </>
            ) : offerStatus === 'offered' ? (
              <>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">{t('employer_sent_offer')}</p>
                      <p className="text-xs text-amber-600 mt-0.5">{t('employer_sent_offer_description')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/worker/job-offers"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 text-base rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <Mail className="w-4 h-4" />
                    {t('review_offer')}
                  </Link>
                  <Link
                    href={`/employer/view-profile?id=${job.employer_id}`}
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm rounded-lg font-medium border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all duration-200"
                  >
                    <Building2 className="w-4 h-4" />
                    {t('view_employer_profile')}
                  </Link>
                </div>
              </>
            ) : offerStatus === 'hired' ? (
              <>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">{t('hired')}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">{t('offer_confirmed_message')}</p>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/employer/view-profile?id=${job.employer_id}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm rounded-lg font-medium border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all duration-200"
                >
                  <Building2 className="w-4 h-4" />
                  {t('view_employer_profile')}
                </Link>
              </>
            ) : job.external_apply_url ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={job.external_apply_url}
                  className="w-full sm:w-auto px-6 py-3 text-base rounded-lg font-semibold shadow-md transition-all duration-300 bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:shadow-lg hover:-translate-y-0.5 text-center"
                >
                  {t('apply')}
                </Link>
                <Link
                  href={`/employer/view-profile?id=${job.employer_id}`}
                  className="inline-flex items-center gap-2 px-4 py-3 text-sm rounded-lg font-medium border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all duration-200"
                >
                  <Building2 className="w-4 h-4" />
                  {t('view_employer_profile')}
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleApply}
                  disabled={applying || hasApplied}
                  className={`w-full sm:w-auto px-6 py-3 text-base rounded-lg font-semibold shadow-md transition-all duration-300 ${
                    hasApplied
                      ? 'bg-slate-400 text-white cursor-not-allowed'
                      : applying
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                  } disabled:opacity-50 disabled:transform-none`}
                >
                  {applying
                    ? t('applying')
                    : hasApplied
                      ? `✓ ${t('applied')}`
                      : t('apply')}
                </button>
                <Link
                  href={`/employer/view-profile?id=${job.employer_id}`}
                  className="inline-flex items-center gap-2 px-4 py-3 text-sm rounded-lg font-medium border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all duration-200"
                >
                  <Building2 className="w-4 h-4" />
                  {t('view_employer_profile')}
                </Link>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

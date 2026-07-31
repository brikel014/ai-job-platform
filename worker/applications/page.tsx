'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { translateCountryCode } from '@/lib/utils/countryTranslation'
import Navbar from '@/components/Navbar'
import { getWorkerProfile, getApplicationsWithJobDetails, getJobPosting, withdrawApplication, confirmOfferAtomic, declineOfferAtomic, getConversationByJobApplication } from '@/lib/db'
import { getSupabaseClient } from '@/lib/db/utils'
import { logError } from '@/lib/logger'
import type { JobPosting, Language } from '@/lib/types'
import type { ApplicationWithJob } from '@/lib/db/optimized'
import { ProfileTooltip } from '@/components/onboarding/ProfileTooltip'
import dynamic from 'next/dynamic'
const ScheduleConflictModal = dynamic(() => import('@/components/worker/ScheduleConflictModal').then(m => ({ default: m.ScheduleConflictModal })), { ssr: false })
import { AcceptButton, DeclineButton, ActionButtonGroup } from '@/components/ui'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Briefcase, 
  Building2, 
  Calendar, 
  Euro,
  MapPin,
  X,
  MessageCircle,
  Home,
  Utensils,
  Trash2,
  Info,
  Share2,
  Send,
  AlertCircle,
  ChevronRight,
  Zap
} from 'lucide-react'
import { shareOnFacebook, shareOnWhatsApp, generateShareText } from '@/lib/utils/share'
import { FlagIcon } from '@/components/ui/FlagIcon'

type FilterStatus = 'all' | 'pending' | 'offered' | 'hired' | 'rejected'

// Language display helper — flag field is ISO 3166-1 alpha-2 country code
const languageDisplay: Record<Language, { flag: string; name: string }> = {
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

export default function WorkerApplicationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar />
        <div className="flex items-center justify-center h-[70vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <WorkerApplicationsContent />
    </Suspense>
  )
}

// Job Detail Panel Component
function JobDetailPanel({
  job,
  application,
  onClose,
  onConfirmOffer,
  onDeclineOffer,
  onContactEmployer,
  onDeleteApplication,
  processingOffer,
  deletingApplication,
  t,
  language
}: {
  job: JobPosting
  application: ApplicationWithJob | undefined
  onClose: () => void
  onConfirmOffer: (appId: string) => void
  onDeclineOffer: (appId: string) => void
  onContactEmployer: (appId: string) => void
  onDeleteApplication: () => void
  processingOffer: string | null
  deletingApplication: boolean
  t: (key: any) => string
  language: string
}) {
  const isOffered = application?.status === 'offered'
  const isHired = application?.status === 'hired' || application?.status === 'accepted'
  const isPending = application?.status === 'pending'

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{job.title}</h2>
              <Link 
                href={`/employer/view-profile?id=${job.employer_id}`}
                className="inline-flex items-center gap-1.5 mt-1 text-sm text-slate-500 hover:text-blue-600 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{job.company_name}</span>
              </Link>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick info badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {job.location_city && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium">
              <MapPin className="w-3.5 h-3.5" />
              {job.location_city}
              {job.location_country && `, ${translateCountryCode(job.location_country, language as Language)}`}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
            <Euro className="w-3.5 h-3.5" />
            {job.salary_range 
              ? t(`salary_${job.salary_range}` as any) || job.salary_range.replace(/_/g, ' ')
              : job.pay_netto && job.pay_netto > 0 
                ? `€${job.pay_netto}/mo`
                : t('salary_negotiable')}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Status Info Banners */}
          {isOffered && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Send className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800 mb-1">
                    🎉 {t('offer_received')}!
                  </p>
                  <p className="text-sm text-blue-700">
                    {t('offer_received_desc')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isHired && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-800 mb-1">
                    🎉 {t('offer_confirmed_title')}
                  </p>
                  <p className="text-sm text-emerald-700">
                    {t('offer_confirmed_message')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isPending && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-800 leading-relaxed">
                    <strong className="font-semibold">Tip:</strong> Once the employer accepts you for the position, it will be visible on your profile as experience.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('description')}</h3>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                <Briefcase className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{t('work_type')}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">{t(job.work_type)}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{t('start_date')}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {new Date(job.start_date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>

            {job.end_date && (
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{t('end_date')}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {new Date(job.end_date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                <Euro className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{t('salary')}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {job.salary_range 
                  ? t(`salary_${job.salary_range}` as any) || job.salary_range.replace(/_/g, ' ')
                  : job.pay_netto && job.pay_netto > 0 
                    ? `€${job.pay_netto}/mo`
                    : t('salary_negotiable')}
              </p>
            </div>
          </div>

          {/* Benefits */}
          {(job.accommodation_included || job.food_included) && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('benefits_perks')}</h3>
              <div className="flex flex-wrap gap-2">
                {job.accommodation_included && (
                  <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 rounded-xl font-medium text-sm border border-emerald-100">
                    <Home className="w-4 h-4" />
                    {t('accommodation_included')}
                  </span>
                )}
                {job.food_included && (
                  <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 rounded-xl font-medium text-sm border border-emerald-100">
                    <Utensils className="w-4 h-4" />
                    {t('food_included')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Language Requirements */}
          {job.language_requirements && job.language_requirements.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('language_requirements')}</h3>
              <div className="flex flex-wrap gap-2">
                {job.language_requirements.map((lang) => {
                  const langInfo = languageDisplay[lang as Language] || { flag: '', name: lang }
                  return (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl font-medium text-sm border border-blue-100"
                    >
                      <FlagIcon code={langInfo.flag} />
                      <span>{langInfo.name}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Footer with Actions */}
      <div className="flex-shrink-0 p-6 border-t border-slate-100 bg-white">
        {isOffered && application && (
          <div className="space-y-3">
            <button
              onClick={() => onContactEmployer(application.id)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white text-slate-700 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              {t('contact_employer')}
            </button>
            <ActionButtonGroup>
              <AcceptButton
                onClick={() => onConfirmOffer(application.id)}
                disabled={processingOffer === application.id}
                isLoading={processingOffer === application.id}
                size="lg"
                className="flex-1"
              >
                {t('confirm_offer')}
              </AcceptButton>
              <DeclineButton
                onClick={() => onDeclineOffer(application.id)}
                disabled={processingOffer === application.id}
                size="lg"
                className="flex-1"
              >
                {t('decline_offer')}
              </DeclineButton>
            </ActionButtonGroup>
          </div>
        )}

        {isHired && application && (
          <button
            onClick={() => onContactEmployer(application.id)}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 shadow-sm hover:shadow transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            {t('contact_employer')}
          </button>
        )}

        {!isOffered && !isHired && (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onDeleteApplication}
              disabled={deletingApplication}
              className="flex items-center gap-2 px-5 py-2.5 text-rose-600 text-sm font-medium rounded-xl border border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deletingApplication ? t('deleting') : t('delete')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function WorkerApplicationsContent() {
  const { user, role, loading: authLoading } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [displayedJob, setDisplayedJob] = useState<JobPosting | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const [displayedApplicationId, setDisplayedApplicationId] = useState<string | null>(null)
  const [deletingApplication, setDeletingApplication] = useState(false)
  const [highlightedApplicationId, setHighlightedApplicationId] = useState<string | null>(null)
  const [processingOffer, setProcessingOffer] = useState<string | null>(null)
  const [scheduleConflict, setScheduleConflict] = useState<{
    applicationId: string
    conflictingJobs: string
    conflictCount: number
  } | null>(null)
  const [offerSuccess, setOfferSuccess] = useState(false)
  const [offerWarning, setOfferWarning] = useState<{
    message: string
    conflictingJobs?: string
    conflictCount?: number
  } | null>(null)
  const [workerProfileId, setWorkerProfileId] = useState<string | null>(null)
  const [confirmingOffer, setConfirmingOffer] = useState<{
    applicationId: string
    jobTitle: string
    companyName: string
    sameEmployerOffers: Array<{ id: string; title: string }>
  } | null>(null)

  // Lock body scroll when mobile panel is open
  useEffect(() => {
    if (isPanelOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isPanelOpen])

  // Redirect non-authenticated users to login, employers to their jobs page
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    
    // Redirect employers - they cannot access worker applications page
    if (!authLoading && user && role === 'employer') {
      router.push('/employer/jobs')
      return
    }
    
    if (user && role === 'worker') {
      loadApplications()
    }
  }, [user, role, authLoading])

  const loadApplications = useCallback(async (showLoading = true) => {
    if (!user) return
    
    if (showLoading) setLoading(true)
    const workerProfile = await getWorkerProfile(user.id)
    if (!workerProfile) {
      router.push('/worker/profile')
      return
    }
    
    setWorkerProfileId(workerProfile.id)
    
    // Optimized: Single query with joins instead of N+1 queries
    const appsWithJobs = await getApplicationsWithJobDetails(workerProfile.id)

    // Filter out direct offers — those show on the Job Offers page
    const workerApplications = appsWithJobs.filter(app => (app as any).origin !== 'direct_offer')

    setApplications(workerApplications)
    if (showLoading) setLoading(false)
    
    return appsWithJobs
  }, [user, router])

  // Auto-open application details when navigating from notification with ?applicationId=xxx
  useEffect(() => {
    const appId = searchParams.get('applicationId')
    if (appId && applications.length > 0 && !highlightedApplicationId) {
      setHighlightedApplicationId(appId)
      const app = applications.find(a => a.id === appId)
      if (app) {
        handleViewDetails(app.job.id, app.id)
      }
    }
  }, [searchParams, applications, highlightedApplicationId])

  // Real-time subscription for application status changes (e.g., employer sends offer)
  useEffect(() => {
    if (!workerProfileId) return

    const supabase = getSupabaseClient()

    const channel = supabase
      .channel(`worker-applications:${workerProfileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'job_applications',
          filter: `worker_profile_id=eq.${workerProfileId}`,
        },
        () => {
          loadApplications(false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workerProfileId, loadApplications])

  const handleViewDetails = async (jobId: string, applicationId: string) => {
    const job = await getJobPosting(jobId)
    if (job) {
      setSelectedJob(job)
      setDisplayedJob(job)
      setSelectedApplicationId(applicationId)
      setDisplayedApplicationId(applicationId)
      setIsPanelOpen(true)
    }
  }

  const handleClosePanel = () => {
    setIsPanelOpen(false)
    setSelectedJob(null)
    setSelectedApplicationId(null)
    setTimeout(() => {
      setDisplayedJob(null)
      setDisplayedApplicationId(null)
    }, 300)
  }

  const handleDeleteApplication = async () => {
    if (!selectedApplicationId) return
    
    if (!confirm('Are you sure you want to delete this application?')) {
      return
    }
    
    setDeletingApplication(true)
    
    try {
      const result = await withdrawApplication(selectedApplicationId)
      if (result.success) {
        setApplications(prev => prev.filter(app => app.id !== selectedApplicationId))
        handleClosePanel()
      } else {
        alert(result.error || 'Failed to withdraw application')
      }
    } catch (error) {
      logError('WorkerApplications', error, undefined, 'Error withdrawing application')
      alert('An error occurred while withdrawing the application')
    } finally {
      setDeletingApplication(false)
    }
  }

  const handleContactEmployer = async (applicationId: string) => {
    try {
      const conversation = await getConversationByJobApplication(applicationId)
      if (conversation) {
        router.push(`/messages?conversationId=${conversation.id}`)
      } else {
        router.push('/messages')
      }
    } catch (error) {
      logError('WorkerApplications', error, undefined, 'Error getting conversation')
      router.push('/messages')
    }
  }

  // Show confirmation modal before accepting — collects same-employer offers for warning
  const handleConfirmOffer = (applicationId: string) => {
    const app = applications.find(a => a.id === applicationId)
    if (!app) return

    const sameEmployerOffers = applications
      .filter(a =>
        a.id !== applicationId &&
        a.status === 'offered' &&
        a.job.employer_id === app.job.employer_id
      )
      .map(a => ({ id: a.id, title: a.job.title }))

    setConfirmingOffer({
      applicationId,
      jobTitle: app.job.title,
      companyName: app.job.company_name,
      sameEmployerOffers,
    })
  }

  // Actually call the API after the user confirms in the modal
  const handleConfirmOfferProceed = async () => {
    if (!confirmingOffer) return
    const { applicationId } = confirmingOffer
    setConfirmingOffer(null)

    setProcessingOffer(applicationId)
    try {
      const result = await confirmOfferAtomic(applicationId)
      if (result.success) {
        await loadApplications()
        handleClosePanel()
        if (result.hasWarning && result.warningMessage) {
          setOfferWarning({
            message: result.warningMessage,
            conflictingJobs: result.conflictingJobs,
            conflictCount: result.conflictCount,
          })
        } else {
          setOfferWarning(null)
        }
        setOfferSuccess(true)
      } else {
        const errorKey = result.error === 'offer_expired' ? 'error_offer_expired'
          : result.error === 'no_positions_left' ? 'error_no_positions_left'
          : result.error === 'not_offered' ? 'error_not_offered'
          : 'error_generic_offer'
        alert(t(errorKey as any))
      }
    } catch (error) {
      logError('WorkerApplications', error, undefined, 'Error confirming offer')
      alert(t('error_generic_offer' as any))
    } finally {
      setProcessingOffer(null)
    }
  }

  const handleDeclineOffer = async (applicationId: string) => {
    if (!confirm(t('decline_offer_application_confirm'))) return
    
    setProcessingOffer(applicationId)
    try {
      const result = await declineOfferAtomic(applicationId)
      if (result.success) {
        await loadApplications()
        handleClosePanel()
      } else {
        alert(result.error || 'Failed to decline offer')
      }
    } catch (error) {
      logError('WorkerApplications', error, undefined, 'Error declining offer')
      alert('An error occurred while declining the offer')
    } finally {
      setProcessingOffer(null)
    }
  }

  // Filter applications based on selected status
  const filteredApplications = applications.filter(app => {
    if (filterStatus === 'all') return app.status !== 'offered'
    if (filterStatus === 'offered') return false
    if (filterStatus === 'hired') return app.status === 'hired' || app.status === 'accepted'
    if (filterStatus === 'rejected') return ['rejected', 'offer_expired', 'offer_declined_by_worker', 'position_filled', 'cancelled'].includes(app.status)
    return app.status === filterStatus
  })

  // Count applications by status
  const offeredCount = applications.filter(a => a.status === 'offered').length
  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    offered: offeredCount,
    hired: applications.filter(a => a.status === 'hired' || a.status === 'accepted').length,
    rejected: applications.filter(a => ['rejected', 'offer_expired', 'offer_declined_by_worker', 'position_filled', 'cancelled'].includes(a.status)).length,
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-100',
          label: t('pending')
        }
      case 'offered':
        return {
          icon: Send,
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-100',
          label: t('offer_received')
        }
      case 'hired':
      case 'accepted':
        return {
          icon: CheckCircle,
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-600',
          borderColor: 'border-emerald-100',
          label: t('hired')
        }
      case 'offer_expired':
        return {
          icon: Clock,
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-600',
          borderColor: 'border-orange-100',
          label: t('offer_expired')
        }
      case 'offer_declined_by_worker':
        return {
          icon: XCircle,
          bgColor: 'bg-slate-100',
          textColor: 'text-slate-500',
          borderColor: 'border-slate-200',
          label: t('offer_declined_title')
        }
      case 'rejected':
        return {
          icon: XCircle,
          bgColor: 'bg-slate-100',
          textColor: 'text-slate-500',
          borderColor: 'border-slate-200',
          label: t('rejected')
        }
      default:
        return {
          icon: Clock,
          bgColor: 'bg-slate-50',
          textColor: 'text-slate-500',
          borderColor: 'border-slate-100',
          label: status
        }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar />
        <div className="flex items-center justify-center h-[70vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500 tracking-wide">{t('loading')}...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      <ProfileTooltip />
      
      {/* Desktop Layout */}
      <div className="hidden lg:block h-[calc(100vh-64px)]">
        <div className="flex h-full">
          {/* Filters Sidebar */}
          <div className={`flex-shrink-0 bg-slate-100 border-r border-slate-200 overflow-hidden transition-all duration-300 ${
            isPanelOpen ? 'w-64' : 'w-72 xl:w-80'
          }`}>
            <div className="h-full overflow-y-auto scrollbar-auto-hide">
              {/* Sidebar Header */}
              <div className="sticky top-0 bg-slate-100 z-10 px-5 py-4 border-b border-slate-200/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{t('applications')}</h2>
                    <p className="text-xs text-slate-500">{t('track_your_applications')}</p>
                  </div>
          </div>
        </div>

              {/* Stats/Filter Buttons */}
              <div className="p-4 space-y-2">
                {[
                  { key: 'all', icon: FileText },
                  { key: 'offered', icon: Send, labelKey: 'waiting_for_your_response', highlight: true },
                  { key: 'pending', icon: Clock },
                  { key: 'hired', icon: CheckCircle },
                  { key: 'rejected', icon: XCircle },
                ].map(({ key, icon: Icon, labelKey, highlight }) => {
                  const count = counts[key as keyof typeof counts]
                  const isActive = filterStatus === key
                  const isOffered = key === 'offered'
                  
                  return (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(key as FilterStatus)}
                    className={`w-full group rounded-xl border p-3 text-left transition-all duration-200 ${
                      isActive
                        ? isOffered
                          ? 'border-amber-500 ring-2 ring-amber-500/10 shadow-lg bg-amber-50'
                          : 'border-blue-500 ring-2 ring-blue-500/10 shadow-lg bg-white'
                        : isOffered && count > 0
                          ? 'border-amber-200 bg-amber-50/50 hover:border-amber-400 hover:shadow-md'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
            <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        isActive
                          ? isOffered ? 'bg-amber-500' : 'bg-blue-600'
                          : isOffered && count > 0
                            ? 'bg-amber-100'
                            : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}>
                        <Icon className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-white'
                            : isOffered && count > 0
                              ? 'text-amber-600'
                              : 'text-slate-500'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-medium ${isOffered && count > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                          {t((labelKey || key) as any)}
                        </p>
                        <p className={`text-xl font-bold ${isOffered && count > 0 ? 'text-amber-800' : 'text-slate-800'}`}>
                          {count}
                        </p>
                      </div>
                      {isOffered && count > 0 && !isActive && (
                        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse flex-shrink-0" />
                      )}
              </div>
                  </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Applications List */}
          <div className="flex-1 min-w-0 overflow-hidden transition-all duration-300">
            <div className="h-full overflow-y-auto bg-white">
              {/* Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      {filterStatus === 'all' ? t('all_applications') : filterStatus === 'offered' ? t('waiting_for_your_response') : t(filterStatus as any)}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      <span className="font-semibold text-blue-600">{filteredApplications.length}</span> {filteredApplications.length === 1 ? 'application' : 'applications'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Application Cards */}
              <div className="p-6">
                {/* Action Required - Pinned Offered Applications */}
                {offeredCount > 0 && (filterStatus === 'all' || filterStatus === 'offered') && (
                  <div className="mb-6">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-200 rounded-2xl overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-blue-100/60 to-blue-100/60 border-b border-blue-200/60">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-blue-900">
                            {t('action_required')}
                          </h3>
                          <p className="text-xs text-blue-700">
                            {t('action_required_offers_desc')}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                          {offeredCount}
                        </span>
                      </div>
                      {/* Offered Applications */}
                      <div className="p-3 space-y-2">
                        {applications
                          .filter(a => a.status === 'offered')
                          .map((app) => {
                            const expiresAt = app.offer_expires_at ? new Date(app.offer_expires_at) : null
                            const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))) : null

                            return (
                              <div
                                key={`action-${app.id}`}
                                className="group flex items-center gap-3 p-3.5 bg-white rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                                onClick={() => handleViewDetails(app.job.id, app.id)}
                              >
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Briefcase className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                    {app.job.title}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    <p className="text-xs text-slate-500 truncate">{app.job.company_name}</p>
                                  </div>
                                </div>
                                {hoursLeft !== null && (
                                  <div className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${hoursLeft <= 12 ? 'text-red-600' : 'text-amber-600'}`}>
                                    <Clock className="w-3 h-3" />
                                    <span>{hoursLeft}h</span>
                                  </div>
                                )}
                                <div className="flex gap-1.5 flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleConfirmOffer(app.id)
                                    }}
                                    disabled={processingOffer === app.id}
                                    className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                  >
                                    {t('confirm_offer')}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeclineOffer(app.id)
                                    }}
                                    disabled={processingOffer === app.id}
                                    className="px-3 py-1.5 text-slate-500 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                  >
                                    {t('decline_offer')}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Info Banner for Pending Applications */}
                {counts.pending > 0 && filterStatus === 'all' && offeredCount === 0 && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <Info className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-blue-800 leading-relaxed">
                          <strong className="font-semibold">Tip:</strong> Once the employer accepts you for the position, it will be visible on your profile as experience.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {filteredApplications.length === 0 && !(offeredCount > 0 && (filterStatus === 'all' || filterStatus === 'offered')) ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        {filterStatus === 'all' ? t('no_applications_yet') : t('no_applications_in_category')}
                      </h3>
                      <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                        {filterStatus === 'all'
                          ? t('browse_jobs_to_apply')
                          : t('no_applications_matching_filter')
                        }
                      </p>
                      {filterStatus === 'all' && (
                        <Link
                          href="/worker/jobs"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5"
                        >
                          <Briefcase className="w-4 h-4" />
                          {t('browse_jobs')}
                        </Link>
                      )}
                    </div>
                  ) : filteredApplications.length > 0 ? (
                    filteredApplications.map((app, index) => {
                      const statusConfig = getStatusConfig(app.status)
                      const StatusIcon = statusConfig.icon
                      
                      return (
                        <div 
                          key={app.id}
                          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                            onClick={() => handleViewDetails(app.job.id, app.id)}
                          >
                            <div className="p-5">
                              {/* Header */}
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 group-hover:bg-blue-50 transition-all">
                                  <Briefcase className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h2 className="font-semibold text-slate-900 leading-tight transition-colors group-hover:text-blue-600 line-clamp-2">
                                    {app.job.title}
                                  </h2>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="text-sm text-slate-500 truncate">{app.job.company_name}</span>
              </div>
            </div>
          </div>
                              
                              {/* Location */}
                              {app.job.location_city && (
                                <div className="flex items-center gap-1.5 mt-3 text-sm text-slate-500">
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">{app.job.location_city}{app.job.location_country ? `, ${translateCountryCode(app.job.location_country, language)}` : ''}</span>
                                </div>
                              )}
                              
                              {/* Tags */}
                              <div className="flex flex-wrap gap-2 mt-4">
                                {/* Status Badge */}
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor} rounded-lg text-xs font-medium`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusConfig.label}
                                </span>
                                {/* Salary */}
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                                  <Euro className="w-3 h-3" />
                                  {app.job.salary_range 
                                    ? t(`salary_${app.job.salary_range}` as any) || app.job.salary_range.replace(/_/g, ' ')
                                    : app.job.pay_netto && app.job.pay_netto > 0 
                                      ? `€${app.job.pay_netto}`
                                      : t('salary_negotiable')}
                                </span>
                                {app.job.accommodation_included && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                                    <Home className="w-3 h-3" />
                                  </span>
                                )}
                                {app.job.food_included && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                                    <Utensils className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                              
                              {/* Actions - show for offered (confirm/decline) */}
                              {app.status === 'offered' && (
                                <div className="mt-4 pt-4 border-t border-blue-100 space-y-2">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleConfirmOffer(app.id)
                                      }}
                                      disabled={processingOffer === app.id}
                                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      {t('confirm_offer')}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeclineOffer(app.id)
                                      }}
                                      disabled={processingOffer === app.id}
                                      className="px-4 py-2.5 text-slate-600 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                                    >
                                      {t('decline_offer')}
                                    </button>
                                  </div>
                                </div>
                              )}

              </div>
            </div>
          </div>
                      )
                    })
                  ) : null}
              </div>
              </div>
            </div>
          </div>

            {/* Mobile backdrop overlay */}
            {isPanelOpen && displayedJob && (
              <div 
                className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                onClick={handleClosePanel}
              />
            )}

            {/* Responsive Detail Panel - sidebar on desktop, fullscreen overlay on mobile */}
          <div className={`bg-white overflow-hidden transition-all duration-300 ${
            isPanelOpen && displayedJob
              ? 'fixed inset-y-0 right-0 w-full z-50 shadow-2xl lg:relative lg:z-auto lg:w-[45%] xl:w-[40%] lg:shadow-none lg:border-l lg:border-slate-200'
              : 'w-0 hidden lg:block lg:border-l lg:border-slate-200'
          }`}>
            {displayedJob && (
              <JobDetailPanel
                job={displayedJob}
                application={applications.find(app => app.id === displayedApplicationId)}
                onClose={handleClosePanel}
                onConfirmOffer={handleConfirmOffer}
                onDeclineOffer={handleDeclineOffer}
                onContactEmployer={handleContactEmployer}
                onDeleteApplication={handleDeleteApplication}
                processingOffer={processingOffer}
                deletingApplication={deletingApplication}
                t={t}
                language={language}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden px-4 py-5 pb-24">
        {/* Mobile Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900">{t('all_applications')}</h1>
        </div>

        {/* Mobile Stats/Filter Buttons - compact horizontal pills */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {[
            { key: 'all', icon: FileText },
            { key: 'offered', icon: Send, labelKey: 'waiting_for_your_response', highlight: true },
            { key: 'pending', icon: Clock },
            { key: 'hired', icon: CheckCircle },
            { key: 'rejected', icon: XCircle },
          ].map(({ key, icon: Icon, labelKey, highlight }) => {
            const count = counts[key as keyof typeof counts]
            const isActive = filterStatus === key
            const isOffered = key === 'offered'

            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key as FilterStatus)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
                  isActive
                    ? isOffered
                      ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20'
                      : 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                    : isOffered && count > 0
                      ? 'border-amber-200 bg-amber-50/50 text-amber-700'
                      : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{t((labelKey || key) as any)}</span>
                <span className={`ml-0.5 min-w-[1.25rem] text-center px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-tight ${
                  isActive
                    ? isOffered ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                    : isOffered && count > 0
                      ? 'bg-amber-200 text-amber-800'
                      : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
                {isOffered && count > 0 && !isActive && (
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                )}
              </button>
            )
          })}
        </div>

        {/* Mobile Applications List */}
        <div className="space-y-3">
          {/* Action Required - Pinned Offered Applications (Mobile) */}
          {offeredCount > 0 && (filterStatus === 'all' || filterStatus === 'offered') && (
            <div className="bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-200 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-100/60 to-blue-100/60 border-b border-blue-200/60">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-blue-900">
                    {t('action_required')}
                  </h3>
                  <p className="text-xs text-blue-700">
                    {t('action_required_offers_desc')}
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                  {offeredCount}
                </span>
              </div>
              {/* Offered Applications */}
              <div className="p-2.5 space-y-2">
                {applications
                  .filter(a => a.status === 'offered')
                  .map((app) => {
                    const expiresAt = app.offer_expires_at ? new Date(app.offer_expires_at) : null
                    const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))) : null
                    
                    return (
                      <div
                        key={`action-mobile-${app.id}`}
                        className="bg-white rounded-xl border border-blue-100 p-3 cursor-pointer"
                        onClick={() => handleViewDetails(app.job.id, app.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {app.job.title}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <p className="text-xs text-slate-500 truncate">{app.job.company_name}</p>
                            </div>
                          </div>
                          {hoursLeft !== null && (
                            <div className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${hoursLeft <= 12 ? 'text-red-600' : 'text-amber-600'}`}>
                              <Clock className="w-3 h-3" />
                              <span>{hoursLeft}h</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleConfirmOffer(app.id)
                            }}
                            disabled={processingOffer === app.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {t('confirm_offer')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeclineOffer(app.id)
                            }}
                            disabled={processingOffer === app.id}
                            className="px-3 py-2 text-slate-500 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            {t('decline_offer')}
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Info Banner for Pending Applications */}
          {counts.pending > 0 && filterStatus === 'all' && offeredCount === 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blue-800 leading-relaxed">
                    <strong className="font-semibold">Tip:</strong> Once the employer accepts you for the position, it will be visible on your profile as experience.
                  </p>
                </div>
              </div>
            </div>
          )}
          {filteredApplications.length === 0 && !(offeredCount > 0 && (filterStatus === 'all' || filterStatus === 'offered')) ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {filterStatus === 'all' ? t('no_applications_yet') : t('no_applications_in_category')}
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                {filterStatus === 'all'
                  ? t('browse_jobs_to_apply')
                  : t('no_applications_matching_filter')
                }
              </p>
              {filterStatus === 'all' && (
                <Link
                  href="/worker/jobs"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5"
                >
                  <Briefcase className="w-4 h-4" />
                  {t('browse_jobs')}
                </Link>
              )}
            </div>
          ) : filteredApplications.length > 0 ? (
            filteredApplications.map((app, index) => {
              const statusConfig = getStatusConfig(app.status)
              const StatusIcon = statusConfig.icon
              
              return (
              <div 
                key={app.id} 
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div 
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    onClick={() => handleViewDetails(app.job.id, app.id)}
                  >
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 group-hover:bg-blue-50 transition-all">
                          <Briefcase className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                          <h2 className="font-semibold text-slate-900 leading-tight transition-colors group-hover:text-blue-600 line-clamp-2">
                            {app.job.title}
                          </h2>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-500 truncate">{app.job.company_name}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Location */}
                      {app.job.location_city && (
                        <div className="flex items-center gap-1.5 mt-3 text-sm text-slate-500">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{app.job.location_city}{app.job.location_country ? `, ${translateCountryCode(app.job.location_country, language)}` : ''}</span>
                        </div>
                      )}
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor} rounded-lg text-xs font-medium`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                        {/* Salary */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                          <Euro className="w-3 h-3" />
                          {app.job.salary_range 
                            ? t(`salary_${app.job.salary_range}` as any) || app.job.salary_range.replace(/_/g, ' ')
                            : app.job.pay_netto && app.job.pay_netto > 0 
                              ? `€${app.job.pay_netto}`
                              : t('salary_negotiable')}
                          </span>
                        {app.job.accommodation_included && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                            <Home className="w-3 h-3" />
                          </span>
                        )}
                        {app.job.food_included && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                            <Utensils className="w-3 h-3" />
                          </span>
                        )}
                    </div>
                    
                      {/* Actions - show for offered (confirm/decline) */}
                      {app.status === 'offered' && (
                        <div className="mt-4 pt-4 border-t border-blue-100 space-y-2">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleConfirmOffer(app.id)
                              }}
                              disabled={processingOffer === app.id}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {t('confirm_offer')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeclineOffer(app.id)
                              }}
                              disabled={processingOffer === app.id}
                              className="px-4 py-2.5 text-slate-600 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                            >
                              {t('decline_offer')}
                            </button>
                          </div>
                        </div>
                      )}


                    </div>
                  </div>
                </div>
              )
            })
          ) : null}
        </div>
        </div>



        {/* Confirm Offer Modal */}
        {confirmingOffer && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-300">
              <div className="px-6 pt-8 pb-2">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                  <CheckCircle className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">
                  {t('confirm_accept_offer_title')}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed text-center mb-1">
                  {t('confirm_accept_offer_question')}
                </p>
                <p className="text-base font-semibold text-slate-800 text-center mb-4">
                  &ldquo;{confirmingOffer.jobTitle}&rdquo;
                </p>

                {confirmingOffer.sameEmployerOffers.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-900 mb-2">
                          {t('same_employer_offers_warning')}
                        </p>
                        <ul className="space-y-1">
                          {confirmingOffer.sameEmployerOffers.map(offer => (
                            <li key={offer.id} className="text-sm text-amber-700 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                              {offer.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 pb-6 space-y-2">
                <button
                  onClick={handleConfirmOfferProceed}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('confirm_offer')}
                </button>
                <button
                  onClick={() => setConfirmingOffer(null)}
                  className="w-full px-5 py-2.5 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-all"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Offer Confirmed Success Modal */}
        {offerSuccess && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-300">
              <div className="px-6 pt-8 pb-6 text-center">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <CheckCircle className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  {t('offer_confirmed_title')}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t('offer_confirmed_message')}
                </p>
              </div>
              {/* Warning section if schedule conflict exists */}
              {offerWarning && (
                <div className="mx-6 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-900 mb-1">
                        {t('offers_auto_declined_title')}
                      </p>
                      <p className="text-sm text-amber-700 leading-relaxed">
                        {offerWarning.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="px-6 pb-6 space-y-2">
                <button
                  onClick={() => {
                    setOfferSuccess(false)
                    setOfferWarning(null)
                  }}
                  className="w-full px-5 py-2.5 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-all"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

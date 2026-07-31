'use client'

import React from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { getJobPosting, getApplicationsByJob, getWorkerProfile, updateApplicationStatus, markApplicationsAsViewed, hireWorker } from '@/lib/db'
import { createOrGetConversationFromApplication } from '@/lib/db/conversations'
import { getSupabaseClient } from '@/lib/db/utils'
import { logError } from '@/lib/logger'
import { translateCountryCode } from '@/lib/utils/countryTranslation'
import type { JobPosting, JobApplication, WorkerProfile, Language } from '@/lib/types'
import type { TranslationKey } from '@/lib/i18n'
import { 
  ArrowLeft, 
  Users, 
  Briefcase,
  Calendar,
  Euro,
  MapPin,
  Clock,
  User,
  Globe2,
  Check,
  X,
  MessageCircle,
  Filter,
  ChevronDown,
  ChevronRight,
  FileText,
  Award,
  Home,
  Languages,
  CheckCircle2
} from 'lucide-react'
import { AcceptButton, DeclineButton, MessageButton, ActionButtonGroup } from '@/components/ui'
import dynamic from 'next/dynamic'
const JobFilledModal = dynamic(() => import('@/components/employer/JobFilledModal').then(m => ({ default: m.JobFilledModal })), { ssr: false })
const HireSuccessModal = dynamic(() => import('@/components/employer/HireSuccessModal').then(m => ({ default: m.HireSuccessModal })), { ssr: false })
import { FlagIcon } from '@/components/ui/FlagIcon'

type StatusFilter = 'all' | 'pending' | 'offered' | 'hired' | 'rejected'

// Predefined certificates list (must match Step2Sectors)
const PREDEFINED_CERTIFICATES = [
  'driving_license_b',
  'driving_license_c',
  'driving_license_ce',
  'forklift_license',
  'crane_operator',
  'welding_certificate',
  'first_aid',
  'safety_training',
  'electrical_safety',
  'food_hygiene',
  'construction_site_safety',
  'hazmat_handling',
] as const

// Helper function to get certificate name with translation
const getCertificateName = (cert: string, t: (key: TranslationKey) => string): string => {
  // Check if it's a predefined certificate
  if (PREDEFINED_CERTIFICATES.includes(cert as typeof PREDEFINED_CERTIFICATES[number])) {
    return t(`cert_${cert}` as TranslationKey)
  }
  // Custom certificate - return as-is
  return cert
}

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

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Application Detail Panel Component (Sliding Panel)
function ApplicationDetailPanel({ 
  application,
  worker,
  job,
  onClose,
  onAccept,
  onReject,
  onMessage,
  isUpdating,
  isSendingMessage,
  t,
  language
}: { 
  application: JobApplication | null
  worker: WorkerProfile | null
  job: JobPosting | null
  onClose: () => void
  onAccept: () => void
  onReject: () => void
  onMessage: () => void
  isUpdating: boolean
  isSendingMessage: boolean
  t: (key: any) => string
  language: string
}) {
  if (!application || !worker) return null

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {worker.profile_image_url ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-slate-100">
                <img
                  src={worker.profile_image_url}
                  alt={worker.full_name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 text-lg font-bold">
                {getInitials(worker.full_name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{worker.full_name}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {t('applied')} {new Date(application.applied_at).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Status Badge */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${
            application.status === 'hired' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
            application.status === 'offered' ? 'bg-blue-50 text-blue-700 border-blue-100' :
            application.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
            application.status === 'rejected' ? 'bg-slate-100 text-slate-500 border-slate-200' :
            application.status === 'withdrawn' ? 'bg-slate-100 text-slate-400 border-slate-200' :
            application.status === 'offer_expired' ? 'bg-orange-50 text-orange-600 border-orange-100' :
            'bg-amber-50 text-amber-700 border-amber-100'
          }`}>
            {application.status === 'hired' ? (t('hired') || 'Hired') :
             application.status === 'accepted' ? (t('hired') || 'Hired') :
             application.status === 'offered' ? (t('waiting_for_worker_confirmation')) :
             application.status === 'offer_expired' ? (t('offer_expired')) :
             application.status === 'pending' ? t('pending_awaiting_response') :
             t(application.status as 'rejected' | 'withdrawn')}
          </span>
          {worker.nationality && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium border border-slate-200">
              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              {translateCountryCode(worker.nationality, language as Language)}
            </span>
          )}
        </div>

        {/* Compact Action Buttons - Under Header */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          {/* View Profile */}
          <Link
            href={`/worker/view-profile?id=${worker.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs rounded-lg font-medium hover:bg-slate-200 transition-all border border-slate-200"
          >
            <User className="w-3.5 h-3.5" />
            {t('view_profile')}
          </Link>
          
          {/* Message Button - Always available for pending/offered/accepted/hired */}
          {(application.status === 'pending' || application.status === 'offered' || application.status === 'accepted' || application.status === 'hired') && (
            <button
              onClick={onMessage}
              disabled={isSendingMessage}
              data-testid="message-worker-panel-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium hover:bg-blue-100 transition-all border border-blue-200 disabled:opacity-50"
            >
              {isSendingMessage ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <MessageCircle className="w-3.5 h-3.5" />
              )}
              {t('send_message')}
            </button>
          )}
          
          {/* Offer Position / Reject - Only for pending */}
          {application.status === 'pending' && (
            <>
              <div className="relative group/tip">
              <button
                onClick={onAccept}
                disabled={isUpdating}
                data-testid="accept-application-panel-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs rounded-lg font-medium hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                {isUpdating ? (
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                  {t('offer_position')}
              </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tip:block z-10">
                  <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 max-w-[240px] shadow-lg">
                    {t('offer_position_tip')}
                  </div>
                </div>
              </div>
              <button
                onClick={onReject}
                disabled={isUpdating}
                data-testid="reject-application-panel-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium hover:bg-slate-200 transition-all border border-slate-200 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                {t('reject')}
              </button>
            </>
          )}
          
          {/* Waiting for confirmation - Only for offered */}
          {application.status === 'offered' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium border border-blue-200">
              <Clock className="w-3.5 h-3.5" />
              {t('waiting_for_confirmation')}
        </div>
          )}
        </div>
        
        {/* Offer position tip - shown for offered status */}
        {application.status === 'offered' && (
          <p className="text-xs text-slate-500 mt-2 px-1">
            {t('offer_position_tip')}
          </p>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <div className="p-6 space-y-6">
          
          {/* Application Message */}
          {application.message && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1.5">
                    {t('worker_message')}
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {application.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Location */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{t('location')}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {worker.preferred_locations && worker.preferred_locations.length > 0
                  ? worker.preferred_locations[0].includes(':') 
                    ? worker.preferred_locations[0].split(':')[0] 
                    : worker.preferred_locations[0]
                  : '-'}
              </p>
            </div>

            {/* Work Types */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                <Briefcase className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{t('work_type')}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {worker.work_types && worker.work_types.length > 0
                  ? worker.work_types.slice(0, 2).map(type => t(type)).join(', ')
                  : '-'}
              </p>
            </div>


            {/* Experience */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{t('experience')}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {worker.experience || '-'}
              </p>
            </div>

            {/* Available Immediately */}
            {worker.available_immediately && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-600 mb-1.5">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{t('available_immediately')}</span>
                </div>
                <p className="text-sm font-semibold text-emerald-800">
                  {t('available_immediately_desc')}
                </p>
              </div>
            )}
          </div>

          {/* Languages */}
          {worker.languages && worker.languages.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('languages')}</h3>
              <div className="flex flex-wrap gap-2">
                {worker.languages.map((lang) => {
                  const langInfo = languageDisplay[lang as Language] || { flag: '', name: lang }
                  return (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 rounded-xl font-medium text-sm border border-slate-200"
                    >
                      <FlagIcon code={langInfo.flag} />
                      <span>{langInfo.name}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Bio / Description */}
          {worker.bio && (
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t('about')}</h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {worker.bio}
              </p>
            </div>
          )}

          {/* Certifications */}
          {worker.certifications && worker.certifications.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('certifications')}</h3>
              <div className="flex flex-wrap gap-2">
                {worker.certifications.map((cert, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 rounded-xl font-medium text-sm border border-slate-200"
                  >
                    <Award className="w-4 h-4 text-slate-400" />
                    {getCertificateName(cert, t)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Work Authorization */}
          {worker.work_authorization && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('work_authorization') || 'Work Authorization'}</h3>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{
                      worker.work_authorization.status === 'eu_citizen' ? t('work_auth_eu_citizen_short')
                      : worker.work_authorization.status === 'permanent_resident' ? t('work_auth_resident_short')
                      : worker.work_authorization.status === 'work_permit_holder' ? t('work_auth_permit_short')
                      : worker.work_authorization.status === 'needs_sponsorship' ? t('work_auth_sponsorship_short')
                      : (worker.work_authorization.status as string).replace(/_/g, ' ')
                    }</p>
                    {worker.work_authorization.countries && worker.work_authorization.countries.length > 0 && (
                      <p className="text-xs text-slate-500">{worker.work_authorization.countries.map(c => c.toUpperCase()).join(', ')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Application Date */}
          <div className="text-center text-xs text-slate-400 pt-2">
            {t('applied')}: {new Date(application.applied_at).toLocaleDateString(undefined, { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

    </div>
  )
}

export default function JobApplicationsPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  
  const { user, loading: authLoading } = useAuth()
  const { t, language } = useLanguage()
  
  const [job, setJob] = useState<JobPosting | null>(null)
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [workers, setWorkers] = useState<Record<string, WorkerProfile | null>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [updatingApp, setUpdatingApp] = useState<string | null>(null)
  const [sendingMessage, setSendingMessage] = useState<string | null>(null)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  
  // Panel state
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [displayedApplication, setDisplayedApplication] = useState<JobApplication | null>(null)
  const [showJobFilledModal, setShowJobFilledModal] = useState(false)
  const [confirmOfferApplicationId, setConfirmOfferApplicationId] = useState<string | null>(null)
  const [dismissedHiredIds, setDismissedHiredIds] = useState<Set<string>>(new Set())
  const [hireSuccessData, setHireSuccessData] = useState<{
    workerName: string
    jobTitle: string
    conversationId: string | null
    worker: WorkerProfile | null
    isOverOffered?: boolean
    totalOfferedAndHired?: number
    positionsAvailable?: number
  } | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!authLoading && user && jobId) {
      loadData()
    }
  }, [user, authLoading, jobId])

  // Subscribe to real-time job application changes for this job
  useEffect(() => {
    if (!user || !jobId) return

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`job-applications:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_applications',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          // Reload all data when a new application comes in (no loading spinner for real-time updates)
          loadData(false)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'job_applications',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          // Reload when an application status changes (no loading spinner for real-time updates)
          loadData(false)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user, jobId])

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    
    const jobData = await getJobPosting(jobId)
    if (!jobData || jobData.status === 'deleted') {
      router.push('/employer/jobs')
      return
    }
    setJob(jobData)
    
    const apps = await getApplicationsByJob(jobId)
    setApplications(apps)
    
    // Mark all applications as viewed by employer
    await markApplicationsAsViewed(jobId)
    
    const workerProfiles: Record<string, WorkerProfile | null> = {}
    for (const app of apps) {
      const profile = await getWorkerProfile(app.worker_id)
      workerProfiles[app.worker_id] = profile
    }
    setWorkers(workerProfiles)
    
    setLoading(false)
  }

  const handleUpdateStatus = async (applicationId: string, status: 'offer' | 'rejected') => {
    setUpdatingApp(applicationId)
    try {
      // Find the application to get worker_id
      const application = applications.find(app => app.id === applicationId)
      if (!application) {
        alert('Application not found')
        setUpdatingApp(null)
        return
      }

      // If accepting, send an offer to the worker (this sets status to 'offered', NOT 'hired')
      // The worker must confirm the offer to be actually hired
      if (status === 'offer' && job) {
        const hireResult = await hireWorker(job.id, application.worker_id, applicationId)
        if (!hireResult.success) {
          await loadData()
          const errorMsg = hireResult.error === 'no_positions_available'
            ? (t('error_no_positions_available' as any) || 'No positions are available for this job.')
            : hireResult.error === 'job_not_active'
              ? (t('error_job_not_active' as any) || 'This job posting is no longer active.')
              : hireResult.error || 'Failed to send the offer. Please try again.'
          alert(errorMsg)
          setUpdatingApp(null)
          return
        }
        // hireWorker now sets status to 'offered' - worker must confirm
        // Create a conversation so employer and worker can chat
        let conversationId: string | null = null
        try {
          const conversation = await createOrGetConversationFromApplication(
            applicationId,
            job.id,
            application.worker_id,
            job.employer_id
          )
          conversationId = conversation?.id || null
        } catch (convError) {
          logError('JobApplications', convError, undefined, 'Failed to create conversation after sending offer')
        }
        // Reload the data (no loading spinner since we're already showing updating state)
        await loadData(false)
        // Also reload the job data to get updated state
        const updatedJob = await getJobPosting(job.id)
        if (updatedJob) {
          setJob(updatedJob)
        }
        
        // Get worker info for the success modal
        const offeredWorker = workers[application.worker_id]
        
        // Show offer sent modal (with over-offer warning if applicable)
        setHireSuccessData({
          workerName: offeredWorker?.full_name || t('worker'),
          jobTitle: job.title,
          conversationId,
          worker: offeredWorker,
          isOverOffered: hireResult.isOverOffered,
          totalOfferedAndHired: hireResult.totalOfferedAndHired,
          positionsAvailable: hireResult.positionsAvailable,
        })
      } else {
        // For rejection, just update the status
        setApplications(prev => prev.map(app =>
          app.id === applicationId
            ? { ...app, status: 'rejected' as const, rejected_at: new Date().toISOString() }
            : app
        ))

        const success = await updateApplicationStatus(applicationId, 'rejected')
        if (success) {
          posthog.capture('application_rejected', {
            job_id: job?.id,
            job_title: job?.title,
            worker_profile_id: application.worker_id,
          })
          await loadData(false)
        } else {
          await loadData(false)
          logError('JobApplications', `Failed to update application ${applicationId} to ${status}`)
          alert(`Failed to ${t('reject').toLowerCase()} the application. Please try again.`)
        }
      }
    } catch (error) {
      await loadData(false)
      logError('JobApplications', error, undefined, 'Error updating application status')
      alert(`An error occurred while updating the application. Please try again.`)
    } finally {
      setUpdatingApp(null)
    }
  }

  const handleSendMessage = async (application: JobApplication, worker: WorkerProfile | null) => {
    if (!worker || !job || sendingMessage) return
    
    setSendingMessage(application.id)
    try {
      const conversation = await createOrGetConversationFromApplication(
        application.id,
        job.id,
        worker.id,
        job.employer_id
      )
      
      if (conversation) {
        router.push(`/messages?conversationId=${conversation.id}`)
      } else {
        alert(t('failed_to_create_conversation') || 'Failed to create conversation. Please try again.')
      }
    } catch (error) {
      logError('JobApplications', error, undefined, 'Error creating conversation')
      alert(t('failed_to_create_conversation') || 'Failed to create conversation. Please try again.')
    } finally {
      setSendingMessage(null)
    }
  }

  const filteredApplications = applications.filter(app => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'offered') {
      return app.status === 'offered'
    }
    if (statusFilter === 'hired') {
      return app.status === 'hired' || app.status === 'accepted'
    }
    return app.status === statusFilter
  })

  const statusCounts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    offered: applications.filter(a => a.status === 'offered').length,
    hired: applications.filter(a => a.status === 'hired' || a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }

  const hasActiveFilter = statusFilter !== 'all'

  const hiredApplications = applications.filter(
    a => a.status === 'hired' && !dismissedHiredIds.has(a.id)
  )

  const clearFilters = () => {
    setStatusFilter('all')
  }

  // Panel handlers
  const handleOpenApplicationDetail = (application: JobApplication) => {
    setSelectedApplication(application)
    setDisplayedApplication(application)
    setIsPanelOpen(true)
  }

  const handleCloseApplicationDetail = () => {
    setIsPanelOpen(false)
    // Keep displayedApplication for animation, clear after transition
    setTimeout(() => {
      setSelectedApplication(null)
      setDisplayedApplication(null)
    }, 300)
  }

  const handlePanelAccept = () => {
    if (!displayedApplication) return
    setConfirmOfferApplicationId(displayedApplication.id)
  }

  const handleConfirmOffer = async () => {
    if (!displayedApplication) return
    setConfirmOfferApplicationId(null)
    await handleUpdateStatus(displayedApplication.id, 'offer')
    // Update the displayed application with new status (now 'offered', worker must confirm)
    setDisplayedApplication({ ...displayedApplication, status: 'offered', offered_at: new Date().toISOString() })
  }

  const handlePanelReject = async () => {
    if (!displayedApplication) return
    await handleUpdateStatus(displayedApplication.id, 'rejected')
    // Update the displayed application with new status  
    setDisplayedApplication({ ...displayedApplication, status: 'rejected', rejected_at: new Date().toISOString() })
  }

  const handlePanelMessage = async () => {
    if (!displayedApplication) return
    const worker = workers[displayedApplication.worker_id]
    await handleSendMessage(displayedApplication, worker)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex items-center justify-center h-[70vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500 tracking-wide">{t('loading')}</span>
          </div>
        </div>

        {/* Render modals even during loading so they aren't hidden by real-time subscription reloads */}
        <HireSuccessModal
          isOpen={!!hireSuccessData}
          onClose={() => setHireSuccessData(null)}
          workerName={hireSuccessData?.workerName || ''}
          jobTitle={hireSuccessData?.jobTitle || ''}
          conversationId={hireSuccessData?.conversationId}
          worker={hireSuccessData?.worker}
          isOverOffered={hireSuccessData?.isOverOffered}
          totalOfferedAndHired={hireSuccessData?.totalOfferedAndHired}
          positionsAvailable={hireSuccessData?.positionsAvailable}
        />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-slate-400" />
            </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">{t('job_not_found')}</h2>
            <Link href="/employer/jobs" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
              ← {t('go_back_to_jobs')}
          </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="applications-page">
      <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
        {/* Header with Back Button and Job Info */}
        <div className="mb-4">
            <Link 
              href="/employer/jobs"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium mb-3 transition-colors"
            >
            <ArrowLeft className="w-4 h-4" />
            {t('go_back_to_jobs') || 'Back to Jobs'}
            </Link>
          
          {/* Job Info Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 lg:w-14 lg:h-14 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-6 h-6 lg:w-7 lg:h-7 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg lg:text-xl font-semibold text-slate-900 truncate">{job.title}</h1>
                  <p className="text-sm text-slate-500">{job.company_name}</p>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">{statusCounts.all}</span>
                  <span className="text-sm text-slate-500 hidden sm:inline">{t('applications') || 'Applications'}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">{statusCounts.pending}</span>
                  <span className="text-sm text-slate-500 hidden sm:inline">{t('pending')}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                  <Check className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">{statusCounts.hired}</span>
                  <span className="text-sm text-slate-500 hidden sm:inline">{t('hired')}</span>
                </div>
              </div>
            </div>
            
            {/* Job Details Row */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
              {job.location_city && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm border border-slate-200">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {job.location_city}{job.location_country && `, ${job.location_country.toUpperCase()}`}
                </span>
              )}
              {job.start_date && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(job.start_date).toLocaleDateString()}
              </span>
              )}
              {(job.salary_range || (job.pay_netto && job.pay_netto > 0)) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm border border-slate-200">
                  <Euro className="w-3.5 h-3.5 text-slate-400" />
                  {job.salary_range 
                    ? t(`salary_${job.salary_range}` as any) || job.salary_range.replace(/_/g, ' ')
                    : `€${job.pay_netto}/mo`}
              </span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile backdrop overlay for detail panel */}
        {isPanelOpen && displayedApplication && (
          <div 
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
            onClick={handleCloseApplicationDetail}
          />
        )}

        {/* Desktop Two-Column Layout */}
        <div className="lg:flex lg:gap-5">
          {/* Sticky Sidebar Filter - Desktop Only, hidden when panel is open */}
          {!isPanelOpen && (
          <div className="hidden lg:block w-64 xl:w-72 flex-shrink-0">
            <div className="sticky top-20 bg-white rounded-xl border border-slate-200">
              {/* Filter Header */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <Filter className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-800">{t('filter')}</h2>
                      {hasActiveFilter && (
                        <p className="text-xs text-slate-500">{t('active')}</p>
                      )}
                    </div>
                  </div>
                  {hasActiveFilter && (
                    <button
                      onClick={clearFilters}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {t('clear_all')}
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Content */}
              <div className="p-4 space-y-2">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  {t('filter') || 'Status'}
                </label>
                
            {(['all', 'pending', 'offered', 'hired', 'rejected'] as StatusFilter[]).map((status) => {
              const isActive = statusFilter === status
                  const config = {
                    all: { label: t('all') },
                    pending: { label: t('pending') },
                    offered: { label: t('offered') },
                    hired: { label: t('hired') },
                    rejected: { label: t('rejected') },
                  }
                  const { label } = config[status]

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                        <span className="font-medium text-sm capitalize">{label}</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600 border border-slate-200'
                      }`}>
                    {statusCounts[status]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden mb-3">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center">
                    <Filter className="w-5 h-5 text-slate-400" />
            </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-slate-800">{t('filter')}</h3>
                    {hasActiveFilter && (
                      <p className="text-xs text-slate-500">
                        {statusFilter === 'pending' ? t('pending') : 
                         statusFilter === 'offered' ? t('offered') :
                         statusFilter === 'hired' ? t('hired') :
                         statusFilter === 'rejected' ? t('rejected') : t('all')}
                      </p>
                )}
              </div>
            </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showFilterDropdown && (
                <div className="mt-2 bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  {(['all', 'pending', 'offered', 'hired', 'rejected'] as StatusFilter[]).map((status) => {
                    const isActive = statusFilter === status
                    const config = {
                      all: { label: t('all') },
                      pending: { label: t('pending') },
                      offered: { label: t('offered') },
                      hired: { label: t('hired') },
                      rejected: { label: t('rejected') },
                    }
                    const { label } = config[status]
                    
                    return (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status)
                          setShowFilterDropdown(false)
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          isActive 
                            ? 'bg-slate-800 text-white' 
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                          <span className="font-medium text-sm capitalize">{label}</span>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600 border border-slate-200'
                        }`}>
                          {statusCounts[status]}
                        </span>
                      </button>
                    )
                  })}
              </div>
              )}
      </div>

      {/* Worker Confirmed Widget */}
      {hiredApplications.length > 0 && (statusFilter === 'all' || statusFilter === 'hired') && (
        <div className="mb-5">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-emerald-100/60 to-green-100/60 border-b border-emerald-200/60">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-emerald-900">
                  {t('worker_confirmed_title')}
                </h3>
                <p className="text-xs text-emerald-700">
                  {t('worker_confirmed_desc')}
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full flex-shrink-0">
                {hiredApplications.length}
              </span>
            </div>
            {/* Hired Application Rows */}
            <div className="p-3 space-y-2">
              {hiredApplications.map((app) => {
                const worker = workers[app.worker_id]
                return (
                  <div
                    key={`hired-${app.id}`}
                    className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all"
                  >
                    {/* Avatar */}
                    {worker?.profile_image_url ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-emerald-100 flex-shrink-0">
                        <img src={worker.profile_image_url} alt={worker.full_name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 text-sm font-bold flex-shrink-0">
                        {worker ? getInitials(worker.full_name) : '?'}
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {worker?.full_name || t('worker')}
                      </p>
                      <p className="text-xs text-emerald-600 font-medium truncate">
                        {t('worker_confirmed_position')}
                        {app.hired_at && (
                          <span className="text-slate-400 font-normal ml-1">
                            · {new Date(app.hired_at).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={async () => {
                          if (!job || !worker) return
                          setSendingMessage(app.id)
                          try {
                            const conversation = await createOrGetConversationFromApplication(
                              app.id, job.id, worker.id, job.employer_id
                            )
                            if (conversation) {
                              router.push(`/messages?conversationId=${conversation.id}`)
                            }
                          } finally {
                            setSendingMessage(null)
                          }
                        }}
                        disabled={sendingMessage === app.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-sm shadow-emerald-500/25"
                      >
                        {sendingMessage === app.id ? (
                          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <MessageCircle className="w-3 h-3" />
                        )}
                        {t('message_worker')}
                      </button>
                      <button
                        onClick={() => setDismissedHiredIds(prev => new Set([...prev, app.id]))}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label={t('dismiss')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Applications List */}
        {filteredApplications.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              {statusFilter === 'all' 
                ? t('no_applications_yet') 
                : statusFilter === 'pending'
                ? t('no_pending_applications')
                : statusFilter === 'hired'
                ? t('no_accepted_applications')
                : t('no_rejected_applications')
              }
            </h3>
                <p className="text-slate-500 text-sm mb-4">
              {statusFilter === 'all' 
                ? t('applications_will_appear')
                    : 'Try a different filter to see more results.'
              }
            </p>
                {hasActiveFilter && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg font-medium hover:bg-slate-900 transition-colors"
                  >
                    {t('clear_filters')}
                  </button>
                )}
          </div>
        ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Desktop Table Header */}
                <div className={`hidden lg:grid gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wide ${
                  isPanelOpen ? 'grid-cols-6' : 'grid-cols-10'
                }`}>
                  <div className={isPanelOpen ? 'col-span-4' : 'col-span-4'}>{t('worker') || 'Applicant'}</div>
                  {!isPanelOpen && <div className="col-span-2">{t('languages')}</div>}
                  {!isPanelOpen && <div className="col-span-2">{t('location')}</div>}
                  <div className={isPanelOpen ? 'col-span-2' : 'col-span-2'}>{t('filter') || 'Status'}</div>
                </div>

                {/* Application Rows */}
                <div className="divide-y divide-slate-100">
            {filteredApplications.map((application) => {
              const worker = workers[application.worker_id]
              const isUpdating = updatingApp === application.id
              
              return (
                <div 
                  key={application.id}
                  data-testid={`application-card-${application.id}`}
                  className={`group cursor-pointer hover:bg-slate-50 transition-colors ${selectedApplication?.id === application.id ? 'ring-2 ring-slate-400 ring-inset' : ''}`}
                  onClick={() => handleOpenApplicationDetail(application)}
                >
                  {/* Responsive Application Row - flex on mobile, grid on desktop */}
                  <div className={`flex items-start gap-3 p-4 lg:grid lg:gap-3 lg:items-center ${
                    isPanelOpen ? 'lg:grid-cols-6' : 'lg:grid-cols-10'
                  }`}>
                    {/* Applicant Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 lg:col-span-4">
                      <Link 
                        href={worker ? `/worker/view-profile?id=${worker.id}` : '#'}
                        className="flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {worker?.profile_image_url ? (
                          <div className="w-10 h-10 lg:w-10 lg:h-10 rounded-full overflow-hidden ring-2 ring-slate-100 group-hover:ring-slate-200 transition-all">
                            <img
                              src={worker.profile_image_url}
                              alt={worker.full_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : worker ? (
                          <div className="w-10 h-10 lg:w-10 lg:h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold ring-2 ring-slate-100 group-hover:ring-slate-200 transition-all">
                            {getInitials(worker.full_name)}
                          </div>
                        ) : (
                          <div className="w-10 h-10 lg:w-10 lg:h-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </Link>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link 
                            href={worker ? `/worker/view-profile?id=${worker.id}` : '#'}
                            className="block text-sm font-semibold text-slate-900 truncate hover:text-slate-700 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {worker?.full_name || t('unknown_worker')}
                          </Link>
                          {/* Status badge - inline on mobile */}
                          <span className={`lg:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                            application.status === 'hired' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            application.status === 'offered' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            application.status === 'accepted' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                            application.status === 'rejected' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                            application.status === 'withdrawn' ? 'bg-slate-100 text-slate-400 border-slate-200' :
                            application.status === 'offer_expired' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {application.status === 'hired' ? (t('hired') || 'Hired') :
                             application.status === 'accepted' ? (t('hired') || 'Hired') :
                             application.status === 'offered' ? (t('offered')) :
                             application.status === 'offer_expired' ? (t('offer_expired')) :
                             application.status === 'pending' ? t('pending_awaiting_response') :
                             t(application.status as 'rejected' | 'withdrawn')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span className="truncate">
                            {t('applied')} {new Date(application.applied_at).toLocaleDateString()}
                          </span>
                          {application.message && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium border border-blue-100" title={t('worker_message')}>
                              <MessageCircle className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Languages (desktop only inline, hidden when panel open) */}
                    {!isPanelOpen && (
                    <div className="hidden lg:flex lg:col-span-2 items-center gap-1">
                      {worker?.languages?.slice(0, 3).map((lang) => (
                        <span 
                          key={lang} 
                          className="inline-flex items-center px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200"
                          title={lang}
                        >
                          <Globe2 className="w-3 h-3 mr-0.5 text-slate-400" />
                          {lang.toUpperCase()}
                        </span>
                      ))}
                      {worker?.languages && worker.languages.length > 3 && (
                        <span className="text-xs text-slate-500">+{worker.languages.length - 3}</span>
                      )}
                    </div>
                    )}
                    
                    {/* Location (desktop only inline, hidden when panel open) */}
                    {!isPanelOpen && (
                    <div className="hidden lg:flex lg:col-span-2 items-center min-w-0">
                      {worker?.preferred_locations && worker.preferred_locations.length > 0 ? (
                        <span className="flex items-center gap-1 text-sm text-slate-600 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          {worker.preferred_locations[0].includes(':') 
                            ? worker.preferred_locations[0].split(':')[0] 
                            : worker.preferred_locations[0]}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                    )}
                    
                    {/* Status (desktop only inline) */}
                    <div className="hidden lg:block lg:col-span-1">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${
                        application.status === 'hired' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        application.status === 'offered' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        application.status === 'accepted' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                        application.status === 'rejected' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                        application.status === 'withdrawn' ? 'bg-slate-100 text-slate-400 border-slate-200' :
                        application.status === 'offer_expired' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {application.status === 'hired' ? (t('hired') || 'Hired') :
                         application.status === 'accepted' ? (t('hired') || 'Hired') :
                         application.status === 'offered' ? (t('offered')) :
                         application.status === 'offer_expired' ? (t('offer_expired')) :
                         t(application.status as 'pending' | 'rejected' | 'withdrawn')}
                      </span>
                    </div>

                    {/* View Details Arrow */}
                    <div className="hidden lg:flex lg:col-span-1 justify-end">
                      <ChevronRight 
                        data-testid={`view-details-${application.id}`}
                        className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" 
                      />
                    </div>
                  </div>
                  
                  {/* Application Message Preview */}
                  {application.message && (
                    <div className="px-4 pb-4 -mt-2">
                      <div className="lg:ml-[52px] p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-start gap-2">
                          <MessageCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('worker_message')}</span>
                            <p className="text-sm text-slate-700 mt-1 line-clamp-2 lg:line-clamp-2">
                              {application.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mobile-only tags */}
                  <div className="lg:hidden px-4 pb-4">
                    <div className="flex flex-wrap gap-1.5">
                      {worker?.languages?.slice(0, 3).map((lang) => (
                        <span 
                          key={lang} 
                          className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200"
                        >
                          {lang.toUpperCase()}
                        </span>
                      ))}
                      {worker?.work_types?.slice(0, 2).map((type) => (
                        <span 
                          key={type}
                          className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200"
                        >
                          {t(type)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
                </div>
          </div>
        )}
          </div>

          {/* Responsive Application Detail Panel - sidebar on desktop, fullscreen on mobile */}
          {isPanelOpen && displayedApplication && (
          <div className="fixed inset-y-0 right-0 w-full z-50 shadow-2xl bg-white overflow-hidden transition-all duration-300 lg:sticky lg:top-20 lg:z-auto lg:w-[45%] xl:w-[40%] lg:shadow-none lg:border lg:border-slate-200 lg:rounded-xl lg:h-[calc(100vh-6rem)] flex-shrink-0">
              <ApplicationDetailPanel
                application={displayedApplication}
                worker={workers[displayedApplication.worker_id]}
                job={job}
                onClose={handleCloseApplicationDetail}
                onAccept={handlePanelAccept}
                onReject={handlePanelReject}
                onMessage={handlePanelMessage}
                isUpdating={updatingApp === displayedApplication.id}
                isSendingMessage={sendingMessage === displayedApplication.id}
                t={t}
                language={language}
              />
          </div>
          )}
        </div>
      </div>

      {/* Offer Sent / Hire Success Modal */}
      <HireSuccessModal
        isOpen={!!hireSuccessData}
        onClose={() => setHireSuccessData(null)}
        workerName={hireSuccessData?.workerName || ''}
        jobTitle={hireSuccessData?.jobTitle || ''}
        conversationId={hireSuccessData?.conversationId}
        worker={hireSuccessData?.worker}
        isOverOffered={hireSuccessData?.isOverOffered}
        totalOfferedAndHired={hireSuccessData?.totalOfferedAndHired}
        positionsAvailable={hireSuccessData?.positionsAvailable}
      />

      {/* Job Filled Modal */}
      {job && (
        <JobFilledModal
          isOpen={showJobFilledModal && !hireSuccessData}
          onClose={() => setShowJobFilledModal(false)}
          jobTitle={job.title}
        />
      )}

      {/* Confirm Send Offer Modal */}
      {confirmOfferApplicationId && displayedApplication && (() => {
        const worker = workers[displayedApplication.worker_id]
        return (
          <>
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
              onClick={() => setConfirmOfferApplicationId(null)}
            />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div
                data-testid="confirm-application-offer-modal"
                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setConfirmOfferApplicationId(null)}
                  className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label={t('close')}
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Check className="w-7 h-7 text-white" />
                  </div>
                </div>

                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-2">
                    {t('confirm_send_offer_title')}
                  </h2>
                  <p className="text-slate-600 text-sm">
                    {t('confirm_send_offer_message').replace('{name}', worker?.full_name || t('worker'))}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmOfferApplicationId(null)}
                    data-testid="confirm-application-offer-cancel"
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all text-sm"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleConfirmOffer}
                    data-testid="confirm-application-offer-confirm"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/25 text-sm"
                  >
                    {t('offer_position')}
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}

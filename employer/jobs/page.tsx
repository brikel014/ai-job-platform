'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { useEmployerJobs, JobTabFilter } from '@/hooks/useEmployerJobs'
import { JobCard } from '@/components/employer/JobCard'
import dynamic from 'next/dynamic'
const ReopenJobModal = dynamic(() => import('@/components/employer/ReopenJobModal').then(m => ({ default: m.ReopenJobModal })), { ssr: false })
import { translateCountryCode } from '@/lib/utils/countryTranslation'
import type { JobPosting, Language } from '@/lib/types'
import type { TranslationKey } from '@/lib/i18n'
import { 
  Plus, 
  FileText, 
  Archive, 
  CheckCircle, 
  AlertCircle,
  Info, 
  Briefcase, 
  MapPin, 
  Calendar, 
  Euro, 
  Clock, 
  Home, 
  Utensils, 
  X, 
  Users, 
  Pencil, 
  Trash2, 
  Pause,
  RefreshCw,
  UserCheck,
  Globe,
  Award
} from 'lucide-react'
import { FlagIcon } from '@/components/ui/FlagIcon'

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

// Job Detail Panel Component
function JobDetailPanel({ 
  job, 
  onClose, 
  onEdit,
  onDelete,
  onDeactivate,
  onReopen,
  onViewApplications,
  isDeleting,
  isDeactivating,
  applicantCount,
  newApplicationCount,
  t,
  language
}: { 
  job: JobPosting | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onDeactivate: () => void
  onReopen: () => void
  onViewApplications: () => void
  isDeleting: boolean
  isDeactivating: boolean
  applicantCount: number
  newApplicationCount: number
  t: (key: any) => string
  language: string
}) {
  if (!job) return null

  const canReopen = job.status === 'filled' || job.status === 'expired'

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {job.employer_profile_image_url ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-slate-100 shadow-lg flex-shrink-0">
                <img 
                  src={job.employer_profile_image_url} 
                  alt={job.company_name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-7 h-7 text-slate-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{job.title}</h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">{job.company_name}</p>
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
        
        {/* Quick info badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {t(job.status)}
          </span>
          {job.location_city && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium border border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {job.location_city}
              {job.location_country && `, ${translateCountryCode(job.location_country, language as Language)}`}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">
            <Euro className="w-3.5 h-3.5 text-slate-400" />
            {job.salary_range 
              ? t(`salary_${job.salary_range}` as any) || job.salary_range.replace(/_/g, ' ')
              : t('salary_negotiable')}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <div className="p-6 space-y-6">
          {/* Applications Card - Clickable */}
          <button
            onClick={onViewApplications}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all group text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('applications') || 'Applications'}</p>
                  <p className="text-2xl font-bold text-slate-900">{applicantCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {newApplicationCount > 0 && (
                  <span className="px-2.5 py-1 bg-slate-800 text-white text-xs font-bold rounded-full">
                    {newApplicationCount} {t('new') || 'new'}
                  </span>
                )}
                <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center group-hover:bg-slate-50 transition-colors">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>

          {/* Description */}
          <div>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t('description')}</h3>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-all">
              {job.description}
            </p>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                <Briefcase className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{t('work_type')}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">{t(job.work_type)}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
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

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{t('experience')}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {job.years_of_experience === 0 || job.years_of_experience === undefined
                  ? t('no_experience_required')
                  : `${job.years_of_experience}+ ${t('years')}`}
              </p>
            </div>

            {/* Positions */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                <UserCheck className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{t('positions') || 'Positions'}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {job.positions_filled || 0} / {job.positions_available || 1} {t('filled') || 'filled'}
              </p>
            </div>

            {/* Job Type */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{t('job_type') || 'Contract'}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">{t(job.job_type) || job.job_type}</p>
            </div>

            {/* End Date if exists */}
            {job.end_date && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{t('end_date') || 'End Date'}</span>
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
          </div>

          {/* Benefits */}
          {(job.accommodation_included || job.food_included) && (
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t('benefits_perks') || 'Benefits'}</h3>
              <div className="flex flex-wrap gap-2">
                {job.accommodation_included && (
                  <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm border border-slate-200">
                    <Home className="w-4 h-4 text-slate-500" />
                    {t('accommodation_included')}
                  </span>
                )}
                {job.food_included && (
                  <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm border border-slate-200">
                    <Utensils className="w-4 h-4 text-slate-500" />
                    {t('food_included')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Language Requirements */}
          {job.language_requirements && job.language_requirements.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t('language_requirements') || 'Language Requirements'}</h3>
              <div className="flex flex-wrap gap-2">
                {job.language_requirements.map((lang) => {
                  const langInfo = languageDisplay[lang as Language] || { flag: '', name: lang }
                  return (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm border border-slate-200"
                    >
                      <FlagIcon code={langInfo.flag} />
                      <span>{langInfo.name}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Certification Requirements */}
          {job.certification_requirements && job.certification_requirements.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t('certifications') || 'Certifications Required'}</h3>
              <div className="flex flex-wrap gap-2">
                {job.certification_requirements.map((cert) => (
                  <span
                    key={cert}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm border border-slate-200"
                  >
                    <Award className="w-4 h-4 text-slate-500" />
                    <span>{getCertificateName(cert, t)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Visibility */}
          {job.visibility && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                {job.visibility === 'public' ? (
                  <Globe className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
                <span className="text-xs font-medium uppercase tracking-wide">{t('visibility') || 'Visibility'}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {job.visibility === 'public' ? (t('public') || 'Public') : (t('private') || 'Private')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Action Buttons */}
      <div className="flex-shrink-0 p-6 border-t border-slate-200 bg-white">
        {job.status === 'active' ? (
          <div className="space-y-3">
            {/* Primary Actions Row */}
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="flex-1 px-4 py-3 text-sm rounded-lg font-semibold transition-all bg-slate-800 text-white hover:bg-slate-900 flex items-center justify-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                {t('edit') || 'Edit'}
              </button>
              <button
                onClick={onViewApplications}
                className="flex-1 px-4 py-3 text-sm rounded-lg font-semibold transition-all bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                {t('applicants') || 'Applicants'}
              </button>
            </div>
            
            {/* Secondary Actions */}
            <div className="flex gap-2">
              <button
                onClick={onDeactivate}
                disabled={isDeactivating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-slate-600 font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 transition-all text-sm"
              >
                {isDeactivating ? (
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
                {t('pause') || 'Pause'}
              </button>
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-slate-600 font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 transition-all text-sm"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {t('delete') || 'Delete'}
              </button>
            </div>
          </div>
        ) : canReopen ? (
          <div className="space-y-3">
            {/* Reopen Action */}
            <button
              onClick={onReopen}
              className="w-full px-6 py-3.5 text-sm rounded-lg font-semibold transition-all bg-slate-800 text-white hover:bg-slate-900 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t('reopen') || 'Reopen Job'}
            </button>
            
            {/* Delete */}
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-600 font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 transition-all text-sm"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {t('delete') || 'Delete'}
            </button>
          </div>
        ) : (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-600 font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 transition-all text-sm"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {t('delete') || 'Delete'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function EmployerJobsPage() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  
  const {
    jobs,
    loading,
    deleting,
    reopening,
    deactivating,
    deleteJob,
    deleteDraft,
    reopenJob,
    deactivateJob,
    tabCounts,
    activeTab,
    switchTab,
    applicationCounts,
    unseenApplicationCounts,
    reloadJobs
  } = useEmployerJobs(user?.id)

  const [reopenModalJob, setReopenModalJob] = useState<{ id: string; title: string } | null>(null)

  // Panel state
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [displayedJob, setDisplayedJob] = useState<JobPosting | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Lock body scroll when mobile modal is open
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

  // Update displayed job when jobs list changes (e.g., after deactivate)
  useEffect(() => {
    if (displayedJob) {
      const updatedJob = jobs.find(j => j.id === displayedJob.id)
      if (updatedJob) {
        setDisplayedJob(updatedJob)
        setSelectedJob(updatedJob)
      } else {
        // Job was deleted or moved to another tab
        handleCloseJobDetail()
      }
    }
  }, [jobs])

  // Refresh jobs when page gets focus (e.g., when navigating back from applications page)
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id && !loading) {
        reloadJobs()
      }
    }

    window.addEventListener('focus', handleFocus)
    // Also refresh on pageshow event (handles browser back/forward navigation)
    const handlePageShow = () => {
      if (user?.id && !loading) {
        reloadJobs()
      }
    }
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [user?.id, reloadJobs, loading])

  const handleSelectJob = (job: JobPosting) => {
    setSelectedJob(job)
    setDisplayedJob(job)
    setIsPanelOpen(true)
  }

  const handleCloseJobDetail = () => {
    setIsPanelOpen(false)
    setSelectedJob(null)
    setTimeout(() => {
      setDisplayedJob(null)
    }, 300)
  }

  const handleDeleteJob = async (jobId: string) => {
    const success = await deleteJob(jobId)
    if (success) {
      handleCloseJobDetail()
    } else {
      alert('Failed to delete job posting')
    }
  }

  const handleDeactivateJob = async (jobId: string) => {
    const success = await deactivateJob(jobId)
    if (!success) {
      alert('Failed to deactivate job posting')
    }
    // Panel will update via the useEffect when jobs list changes
  }

  const handleReopenJob = async (positions: number, endDate: string | null) => {
    if (!reopenModalJob) return
    
    const success = await reopenJob(reopenModalJob.id, positions, endDate)
    if (success) {
      setReopenModalJob(null)
      handleCloseJobDetail()
    } else {
      alert('Failed to reopen job posting')
    }
  }

  const tabs: { key: JobTabFilter; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'active', label: t('active_jobs') || 'Active', icon: <CheckCircle className="w-4 h-4" />, color: 'emerald' },
    { key: 'inactive', label: t('inactive_jobs') || 'Inactive', icon: <Archive className="w-4 h-4" />, color: 'amber' },
    { key: 'draft', label: t('drafts') || 'Drafts', icon: <FileText className="w-4 h-4" />, color: 'slate' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-sm font-medium text-slate-500">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="employer-jobs-page">
        {/* Reopen Job Modal */}
        {reopenModalJob && (
          <ReopenJobModal
            jobTitle={reopenModalJob.title}
            onSubmit={handleReopenJob}
            onCancel={() => setReopenModalJob(null)}
            isLoading={reopening === reopenModalJob.id}
          />
        )}

      {/* Mobile Full-Screen Job Detail Modal */}
      <div 
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          isPanelOpen ? 'visible' : 'invisible'
        }`}
      >
        <div 
          className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
            isPanelOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleCloseJobDetail}
        />
        
        <div className={`absolute inset-y-0 right-0 w-full bg-white shadow-2xl transition-transform duration-300 ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          {displayedJob && (
            <JobDetailPanel
              job={displayedJob}
              onClose={handleCloseJobDetail}
              onEdit={() => router.push(`/employer/jobs/${displayedJob.id}`)}
              onDelete={() => handleDeleteJob(displayedJob.id)}
              onDeactivate={() => handleDeactivateJob(displayedJob.id)}
              onReopen={() => setReopenModalJob({ id: displayedJob.id, title: displayedJob.title })}
              onViewApplications={() => router.push(`/employer/jobs/${displayedJob.id}/applications`)}
              isDeleting={deleting === displayedJob.id}
              isDeactivating={deactivating === displayedJob.id}
              applicantCount={applicationCounts[displayedJob.id] ?? 0}
              newApplicationCount={unseenApplicationCounts[displayedJob.id] ?? 0}
              t={t}
              language={language}
            />
          )}
        </div>
      </div>

      {/* Unified Responsive Layout */}
      <div className="lg:h-[calc(100vh-64px)] lg:flex">
        {/* Main Content */}
        <div className="flex-1 min-w-0 lg:overflow-hidden transition-all duration-300">
          <div className="lg:h-full lg:overflow-y-auto bg-slate-50">
            {/* Header */}
            <div className="px-4 lg:px-6 py-4 lg:sticky lg:top-0 lg:bg-slate-50/95 lg:backdrop-blur-sm lg:z-10 lg:border-b lg:border-slate-200/60">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl lg:text-xl font-bold text-slate-900 truncate">{t('jobs')}</h1>
                  <p className="text-sm text-slate-500 mt-0.5">{t('manage_job_postings')}</p>
                </div>
                <button
                  onClick={() => router.push('/employer/jobs/create')}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                  data-testid="create-job-button"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('create_job')}</span>
                  <span className="sm:hidden">{t('create') || 'Create'}</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 lg:px-6 py-4 lg:py-6 pb-24 lg:pb-6">
              {/* Tabs */}
              <div className="mb-6">
                <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
                  <div className="flex gap-1 lg:gap-1 p-1 lg:p-1 bg-slate-100 rounded-lg lg:rounded-lg w-fit min-w-full lg:min-w-0">
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => switchTab(tab.key)}
                        data-testid={`tab-${tab.key}`}
                        className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-2 px-4 py-2.5 lg:py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                          activeTab === tab.key
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                          activeTab === tab.key
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {tabCounts[tab.key]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tab Description */}
              {activeTab === 'active' && jobs.length > 0 && (
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    {t('active_jobs_auto_archive_tip')}
                  </p>
                </div>
              )}
              {activeTab === 'inactive' && (
                <div className="flex items-start gap-3 bg-slate-100 border border-slate-200 rounded-lg p-4 mb-6">
                  <AlertCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600">
                    {t('inactive_jobs_description') || 'These jobs are filled or expired. You can reopen them to start hiring again.'}
                  </p>
                </div>
              )}

              {/* Empty State */}
              {jobs.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 lg:p-12 text-center">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7 text-slate-400" />
                  </div>
                  {activeTab === 'active' ? (
                    <>
                      <h3 className="text-lg font-medium text-slate-800 mb-2">{t('no_job_postings_yet')}</h3>
                      <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                        {t('create_first_job_description')}
                      </p>
                      <button
                        onClick={() => router.push('/employer/jobs/create')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        {t('create_your_first_job')}
                      </button>
                    </>
                  ) : activeTab === 'draft' ? (
                    <>
                      <h3 className="text-lg font-medium text-slate-800 mb-2">{t('no_drafts')}</h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        {t('no_drafts_description')}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium text-slate-800 mb-2">{t('no_inactive_jobs') || 'No Inactive Jobs'}</h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        {t('no_inactive_jobs_description') || 'Jobs that are filled or expired will appear here.'}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Listings */}
              {activeTab === 'draft' ? (
                /* Draft Cards */
                <div className="space-y-3 lg:space-y-4">
                  {jobs.map((draft, index) => (
                    <div
                      key={draft.id}
                      className="animate-in fade-in slide-in-from-bottom-2 duration-300 bg-white border border-dashed border-slate-300 rounded-xl p-4 sm:p-5 hover:border-slate-400 hover:shadow-sm transition-all group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-slate-800 truncate">
                            {draft.title || t('untitled_draft')}
                          </h3>
                          {draft.description && (
                            <p className="text-sm text-slate-500 line-clamp-2 mt-1">{draft.description}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-2">
                            <Calendar className="w-3.5 h-3.5 inline mr-1" />
                            {new Date(draft.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link
                            href={`/employer/jobs/create?draft=${draft.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            {t('continue') || 'Continue'}
                          </Link>
                          <button
                            onClick={() => deleteDraft(draft.id)}
                            disabled={deleting === draft.id}
                            className="inline-flex items-center justify-center p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title={t('delete')}
                          >
                            {deleting === draft.id ? (
                              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Job Cards */
                <div className="space-y-3 lg:space-y-4">
                  {jobs.map((job, index) => {
                    const canReopen = job.status === 'filled' || job.status === 'expired'
                    return (
                      <div
                        key={job.id}
                        className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <JobCard
                          job={job}
                          onSelect={handleSelectJob}
                          onDelete={handleDeleteJob}
                          onReopen={canReopen ? () => setReopenModalJob({ id: job.id, title: job.title }) : undefined}
                          onDeactivate={job.status === 'active' ? () => handleDeactivateJob(job.id) : undefined}
                          isDeleting={deleting === job.id}
                          isReopening={reopening === job.id}
                          isDeactivating={deactivating === job.id}
                          isSelected={displayedJob?.id === job.id}
                          showDeleteButton={job.status !== 'deleted'}
                          applicantCount={applicationCounts[job.id] ?? 0}
                          newApplicationCount={unseenApplicationCounts[job.id] || 0}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Job Detail Panel */}
        <div className={`hidden lg:block bg-white border-l border-slate-200 overflow-hidden transition-all duration-300 ${
          isPanelOpen ? 'w-[45%] xl:w-[40%]' : 'w-0'
        }`}>
          {displayedJob && (
            <JobDetailPanel
              job={displayedJob}
              onClose={handleCloseJobDetail}
              onEdit={() => router.push(`/employer/jobs/${displayedJob.id}`)}
              onDelete={() => handleDeleteJob(displayedJob.id)}
              onDeactivate={() => handleDeactivateJob(displayedJob.id)}
              onReopen={() => setReopenModalJob({ id: displayedJob.id, title: displayedJob.title })}
              onViewApplications={() => router.push(`/employer/jobs/${displayedJob.id}/applications`)}
              isDeleting={deleting === displayedJob.id}
              isDeactivating={deactivating === displayedJob.id}
              applicantCount={applicationCounts[displayedJob.id] ?? 0}
              newApplicationCount={unseenApplicationCounts[displayedJob.id] ?? 0}
              t={t}
              language={language}
            />
          )}
        </div>
      </div>
    </div>
  )
}

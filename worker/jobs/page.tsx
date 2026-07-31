'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { translateCountryCode } from '@/lib/utils/countryTranslation'
import Navbar from '@/components/Navbar'
import { getJobPostings, applyToJobAtomic, getWorkerProfile, getApplicationsByWorker } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'
import type { JobPosting, WorkType, Language, ExperienceLevel } from '@/lib/types'
import { Briefcase, MapPin, Calendar, Euro, Home, Utensils, CheckCircle2, Filter, X, ChevronDown, ChevronRight, ArrowRight, Building2, Clock, Sparkles, Search, SlidersHorizontal, FileCheck, Zap, Languages, Mail } from 'lucide-react'
import { ProfileTooltip } from '@/components/onboarding/ProfileTooltip'
import { logError } from '@/lib/logger'
import dynamic from 'next/dynamic'
const CompleteProfileModal = dynamic(() => import('@/components/onboarding/CompleteProfileModal').then(m => ({ default: m.CompleteProfileModal })), { ssr: false })
const ApplyJobModal = dynamic(() => import('@/components/worker/ApplyJobModal').then(m => ({ default: m.ApplyJobModal })), { ssr: false })
import type { WorkerProfile } from '@/lib/types'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { getSupabaseClient } from '@/lib/db/utils'

// Helper to check if profile is complete enough to apply
const isProfileComplete = (profile: WorkerProfile | null): boolean => {
  if (!profile) return false
  return !!(
    profile.full_name &&
    profile.full_name.trim().length > 0 &&
    profile.work_types &&
    profile.work_types.length > 0
  )
}

// Wrap the main component in Suspense for useSearchParams
export default function WorkerJobsPage() {
  const { t } = useLanguage()
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafbfc]">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500 tracking-wide">{t('loading_jobs') || 'Loading jobs...'}</span>
          </div>
        </div>
      </div>
    }>
      <WorkerJobsContent />
    </Suspense>
  )
}

// Language display helper — flag field is ISO 3166-1 alpha-2 country code for CSS flag icon
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
  onApply,
  applying,
  hasApplied,
  offerStatus,
  t,
  language
}: {
  job: JobPosting | null
  onClose: () => void
  onApply: (jobId: string, jobTitle?: string) => void
  applying: string | null
  hasApplied: boolean
  offerStatus?: string
  t: (key: any) => string
  language: string
}) {
  const [panelTranslations, setPanelTranslations] = useState<Record<'title' | 'description', { text: string; loading: boolean; error: boolean; visible: boolean } | null>>({
    title: null,
    description: null,
  })

  useEffect(() => {
    setPanelTranslations({ title: null, description: null })
  }, [job?.id])

  const handlePanelTranslate = async (field: 'title' | 'description', content: string) => {
    const current = panelTranslations[field]

    if (current?.text && current.visible) {
      setPanelTranslations(prev => ({ ...prev, [field]: { ...current, visible: false } }))
      return
    }

    if (current?.text && !current.visible) {
      setPanelTranslations(prev => ({ ...prev, [field]: { ...current, visible: true } }))
      return
    }

    setPanelTranslations(prev => ({ ...prev, [field]: { text: '', loading: true, error: false, visible: false } }))

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, targetLang: language }),
      })

      if (!response.ok) throw new Error('Translation failed')

      const data = await response.json()
      setPanelTranslations(prev => ({ ...prev, [field]: { text: data.translatedText, loading: false, error: false, visible: true } }))
    } catch {
      setPanelTranslations(prev => ({ ...prev, [field]: { text: '', loading: false, error: true, visible: false } }))
    }
  }

  if (!job) return null

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Employer Profile Image or Fallback */}
            {job.employer_profile_image_url ? (
              <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-slate-100 shadow-lg flex-shrink-0">
                <img 
                  src={job.employer_profile_image_url} 
                  alt={job.company_name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                <Briefcase className="w-7 h-7 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {panelTranslations.title?.visible ? panelTranslations.title.text : job.title}
              </h2>
              <button
                onClick={() => handlePanelTranslate('title', job.title)}
                disabled={panelTranslations.title?.loading}
                className="flex items-center gap-1 mt-1 text-xs text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50"
              >
                <Languages className="w-3 h-3" />
                <span>
                  {panelTranslations.title?.loading
                    ? t('translating')
                    : panelTranslations.title?.error
                      ? t('translation_failed')
                      : panelTranslations.title?.visible
                        ? t('show_original')
                        : t('translate')}
                </span>
              </button>
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
            {job.salary_range
              ? t(`salary_${job.salary_range}` as any) || job.salary_range.replace(/_/g, ' ')
              : job.pay_netto && job.pay_netto > 0
                ? `€${job.pay_netto}/mo`
                : job.pay_brutto && job.pay_brutto > 0
                  ? `€${job.pay_brutto}/mo`
                  : t('salary_negotiable')}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('description')}</h3>
              <button
                onClick={() => handlePanelTranslate('description', job.description)}
                disabled={panelTranslations.description?.loading}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50"
              >
                <Languages className="w-3 h-3" />
                <span>
                  {panelTranslations.description?.loading
                    ? t('translating')
                    : panelTranslations.description?.error
                      ? t('translation_failed')
                      : panelTranslations.description?.visible
                        ? t('show_original')
                        : t('translate')}
                </span>
              </button>
            </div>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
              {panelTranslations.description?.visible ? panelTranslations.description.text : job.description}
            </p>
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

            <div className="p-4 bg-slate-50 rounded-xl">
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
                    : job.pay_brutto && job.pay_brutto > 0
                      ? `€${job.pay_brutto}/mo (${t('brutto')})`
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

          {/* Work Permit Info */}
          {(job.work_permit_required || job.work_permit_sponsorship_offered) && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('work_permit_requirements')}</h3>
              <div className="flex flex-wrap gap-2">
                {job.work_permit_required && (
                  <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 rounded-xl font-medium text-sm border border-amber-100">
                    <FileCheck className="w-4 h-4" />
                    {t('work_permit_required')}
                  </span>
                )}
                {job.work_permit_sponsorship_offered && (
                  <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 rounded-xl font-medium text-sm border border-emerald-100">
                    <FileCheck className="w-4 h-4" />
                    {t('visa_sponsorship_available')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Language Requirements */}
          {job.language_requirements && job.language_requirements.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('language_requirements') || 'Language Requirements'}</h3>
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

      {/* Fixed Apply Button / Offer Info */}
      <div className="flex-shrink-0 p-6 border-t border-slate-100 bg-white space-y-3">
        {offerStatus === 'offered' ? (
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
            <Link
              href="/worker/job-offers"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 transition-all duration-200"
            >
              <Mail className="w-4 h-4" />
              {t('review_offer')}
            </Link>
          </>
        ) : offerStatus === 'hired' ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">{t('hired')}</p>
                <p className="text-xs text-emerald-600 mt-0.5">{t('offer_confirmed_message')}</p>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onApply(job.id, job.title)}
            disabled={applying === job.id || hasApplied}
            data-testid={hasApplied ? `applied-button-${job.id}` : `apply-button-${job.id}`}
            className={`w-full px-6 py-4 text-base rounded-xl font-semibold transition-all duration-300 ${
              hasApplied
                ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                : applying === job.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5'
            }`}
          >
            {applying === job.id
              ? t('applying')
              : hasApplied
                ? `✓ ${t('applied')}`
                : t('apply')}
          </button>
        )}
        <Link
          href={`/employer/view-profile?id=${job.employer_id}`}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-xl font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all duration-200"
        >
          <Building2 className="w-4 h-4" />
          {t('view_employer_profile')}
        </Link>
      </div>
    </div>
  )
}

function WorkerJobsContent() {
  const { user, role, loading: authLoading } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const employerIdFilter = searchParams.get('employer_id')
  const employerNameFilter = searchParams.get('employer_name')
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [directOfferStatuses, setDirectOfferStatuses] = useState<Map<string, string>>(new Map())

  // Selected job for detail panel
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [displayedJob, setDisplayedJob] = useState<JobPosting | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  
  // Helper to deserialize filters from URL params
  const deserializeFilters = (searchParams: URLSearchParams) => {
    return {
      work_types: searchParams.get('work_types')?.split(',').filter(Boolean) as WorkType[] || [],
      languages: searchParams.get('languages')?.split(',').filter(Boolean) as Language[] || [],
      experience_levels: searchParams.get('experience_levels')?.split(',').filter(Boolean) as ExperienceLevel[] || [],
      locations: searchParams.get('locations')?.split(',').filter(Boolean) || [],
      cities: searchParams.get('cities')?.split(',').filter(Boolean) || [],
      min_pay: searchParams.get('min_pay') || '',
      max_pay: searchParams.get('max_pay') || '',
      accommodation_included: searchParams.get('accommodation_included') === 'true',
      food_included: searchParams.get('food_included') === 'true',
      include_negotiable: searchParams.get('include_negotiable') === 'true',
      start_date_from: searchParams.get('start_date_from') || '',
      start_date_to: searchParams.get('start_date_to') || '',
      hide_applied: searchParams.get('hide_applied') === 'true',
    }
  }

  const [filters, setFilters] = useState(() => deserializeFilters(searchParams))
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [showWorkTypeDropdown, setShowWorkTypeDropdown] = useState(false)
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [showExperienceDropdown, setShowExperienceDropdown] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [pendingJobTitle, setPendingJobTitle] = useState<string | undefined>(undefined)
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [showFiltersMobile, setShowFiltersMobile] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [applicationOfferedCount, setApplicationOfferedCount] = useState(0)
  const [directOfferCount, setDirectOfferCount] = useState(0)
  
  // Apply modal state
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [applyingJob, setApplyingJob] = useState<JobPosting | null>(null)

  // Sync filters from URL params when they change
  useEffect(() => {
    const urlFilters = deserializeFilters(searchParams)
    setFilters(prevFilters => {
      const filtersChanged = JSON.stringify(urlFilters) !== JSON.stringify(prevFilters)
      return filtersChanged ? urlFilters : prevFilters
    })
  }, [searchParams])

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

  // Redirect non-authenticated users to login, employers to their jobs page
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    
    if (!authLoading && user && role === 'employer') {
      router.push('/employer/jobs')
      return
    }
    
    if (user && role === 'worker') {
      loadJobs()
    }
  }, [user, role, authLoading, filters, employerIdFilter])

  const loadJobs = async () => {
    if (!user) return
    
    setLoading(true)
    const filterParams: any = { status: 'active' }
    
    if (filters.work_types.length > 0) filterParams.work_types = filters.work_types
    if (filters.languages.length > 0) filterParams.languages = filters.languages
    if (filters.experience_levels.length > 0) filterParams.experience_levels = filters.experience_levels
    if (filters.min_pay) filterParams.min_pay = parseInt(filters.min_pay)
    if (filters.max_pay) filterParams.max_pay = parseInt(filters.max_pay)
    if (filters.accommodation_included) filterParams.accommodation_included = true
    if (filters.food_included) filterParams.food_included = true
    if (filters.start_date_from) filterParams.start_date_from = filters.start_date_from
    if (filters.start_date_to) filterParams.start_date_to = filters.start_date_to
    
    let jobList = await getJobPostings(filterParams)
    
    // Client-side filtering for multiple selections
    if (filters.work_types.length > 0) {
      jobList = jobList.filter(job => filters.work_types.includes(job.work_type))
    }
    if (filters.languages.length > 0) {
      jobList = jobList.filter(job => 
        filters.languages.some(lang => job.language_requirements.includes(lang))
      )
    }
    if (filters.experience_levels.length > 0) {
      jobList = jobList.filter(job => job.experience_level && filters.experience_levels.includes(job.experience_level))
    }
    
    // Client-side location filter
    if (filters.locations.length > 0) {
      jobList = jobList.filter(job => {
        if (filters.locations.includes('anywhere')) {
          return true
        }
        if (!job.location_country) return false
        return filters.locations.includes(job.location_country.toLowerCase())
      })
    }
    
    // Client-side city filter
    if (filters.cities.length > 0) {
      jobList = jobList.filter(job => {
        if (!job.location_city) return false
        return filters.cities.some(city =>
          job.location_city?.toLowerCase().includes(city.toLowerCase())
        )
      })
    }

    // Client-side salary range filter
    if (filters.min_pay || filters.max_pay) {
      const salaryRangeMin: Record<string, number> = {
        'under_500': 0, '500_1000': 500, '1000_1500': 1000, '1500_2000': 1500,
        '2000_2500': 2000, '2500_3000': 2500, '3000_3500': 3000, '3500_4000': 3500,
        '4000_4500': 4000, '4500_5000': 4500, 'over_5000': 5000,
      }
      const salaryRangeMax: Record<string, number> = {
        'under_500': 500, '500_1000': 1000, '1000_1500': 1500, '1500_2000': 2000,
        '2000_2500': 2500, '2500_3000': 3000, '3000_3500': 3500, '3500_4000': 4000,
        '4000_4500': 4500, '4500_5000': 5000, 'over_5000': Infinity,
      }
      const minPay = filters.min_pay ? parseInt(filters.min_pay) : 0
      const maxPay = filters.max_pay ? parseInt(filters.max_pay) : Infinity

      jobList = jobList.filter(job => {
        if (!job.salary_range) return true
        if (job.salary_range === 'negotiable') return !!filters.include_negotiable
        const rangeMax = salaryRangeMax[job.salary_range]
        const rangeMin = salaryRangeMin[job.salary_range]
        if (rangeMax === undefined || rangeMin === undefined) return true
        return rangeMax >= minPay && rangeMin <= maxPay
      })
    }

    // Filter by employer ID from URL
    if (employerIdFilter) {
      jobList = jobList.filter(job => job.employer_id === employerIdFilter)
    }
    
    setJobs(jobList)
    
    // Load worker's profile and applications
    const profile = await getWorkerProfile(user.id)
    setWorkerProfile(profile)
    
    if (profile) {
      const applications = await getApplicationsByWorker(profile.id)
      // Only mark jobs as "applied" if the worker actually applied (not employer-initiated offers)
      const appliedIds = new Set(
        applications
          .filter(app => (app as any).origin !== 'direct_offer')
          .map(app => app.job_id)
      )
      setAppliedJobIds(appliedIds)
      // Track direct offer statuses per job
      const offerStatuses = new Map<string, string>()
      applications
        .filter(app => (app as any).origin === 'direct_offer')
        .forEach(app => offerStatuses.set(app.job_id, app.status))
      setDirectOfferStatuses(offerStatuses)
      setApplicationOfferedCount(applications.filter(app => app.status === 'offered' && (app as any).origin !== 'direct_offer').length)
      setDirectOfferCount(applications.filter(app => app.status === 'offered' && (app as any).origin === 'direct_offer').length)
    }
    
    setLoading(false)
  }

  // Refresh application statuses (offers, applied) without reloading jobs
  const refreshApplicationStatuses = useCallback(async () => {
    if (!workerProfile) return
    const applications = await getApplicationsByWorker(workerProfile.id)
    const appliedIds = new Set(
      applications
        .filter(app => (app as any).origin !== 'direct_offer')
        .map(app => app.job_id)
    )
    setAppliedJobIds(appliedIds)
    const offerStatuses = new Map<string, string>()
    applications
      .filter(app => (app as any).origin === 'direct_offer')
      .forEach(app => offerStatuses.set(app.job_id, app.status))
    setDirectOfferStatuses(offerStatuses)
    setApplicationOfferedCount(applications.filter(app => app.status === 'offered' && (app as any).origin !== 'direct_offer').length)
    setDirectOfferCount(applications.filter(app => app.status === 'offered' && (app as any).origin === 'direct_offer').length)
  }, [workerProfile])

  // Real-time subscription for application changes (e.g., employer sends offer)
  useEffect(() => {
    if (!workerProfile?.id) return

    const supabase = getSupabaseClient()

    const channel = supabase
      .channel(`worker-jobs-offers:${workerProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_applications',
          filter: `worker_profile_id=eq.${workerProfile.id}`,
        },
        () => {
          refreshApplicationStatuses()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workerProfile?.id, refreshApplicationStatuses])

  // Open the apply modal instead of applying directly
  const handleApply = async (jobId: string, jobTitle?: string) => {
    if (!user) return
    
    if (!isProfileComplete(workerProfile)) {
      localStorage.setItem('pending_job_application', jobId)
      setPendingJobTitle(jobTitle)
      setShowProfileModal(true)
      return
    }
    
    // Find the job and open the apply modal
    const job = jobs.find(j => j.id === jobId)
    if (job) {
      setApplyingJob(job)
      setShowApplyModal(true)
    }
  }
  
  // Submit application with message
  const handleSubmitApplication = async (message: string, phone: string) => {
    if (!user || !applyingJob || !workerProfile) return

    setApplying(applyingJob.id)

    try {
      // Save the contact phone on the auth user so it's remembered and auto-filled
      // on future applications. Stored as metadata (not auth.users.phone) to avoid
      // triggering Supabase's native phone-change OTP SMS. Non-fatal on failure.
      const savedPhone = user.user_metadata?.contact_phone as string | undefined
      if (phone && phone !== savedPhone) {
        const { error: phoneError } = await createClient().auth.updateUser({
          data: { contact_phone: phone },
        })
        if (phoneError) {
          logError('WorkerJobs', phoneError, undefined, 'Failed to save contact phone')
        }
      }

      const result = await applyToJobAtomic(applyingJob.id, workerProfile.id, message)

      if (result.success) {
        setAppliedJobIds(prev => new Set([...prev, applyingJob.id]))
        setSuccessMessage(t('application_successful'))
        setTimeout(() => setSuccessMessage(null), 4000)
        setShowApplyModal(false)
        setApplyingJob(null)
      } else {
        if (result.error === 'already_applied') {
          // Worker already has an active application (possibly a direct offer)
          setDirectOfferStatuses(prev => new Map(prev).set(applyingJob.id, 'offered'))
          setShowApplyModal(false)
          setApplyingJob(null)
        } else {
          const errorMsg = result.error === 'no_positions_available' ? t('error_no_positions_available' as any)
            : result.error === 'job_not_active' ? t('error_job_not_active' as any)
            : result.error === 'previously_declined' ? (t('offer_declined_no_reapply') || 'You cannot re-apply to this position.')
            : t('error_generic_offer' as any) || 'Failed to apply. Please try again.'
          alert(errorMsg)
        }
      }
    } catch (error) {
      logError('WorkerJobs', error, undefined, 'Error applying to job')
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setApplying(null)
    }
  }
  
  const handleCloseApplyModal = () => {
    if (!applying) {
      setShowApplyModal(false)
      setApplyingJob(null)
    }
  }

  // Handle job selection
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

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500 tracking-wide">{t('loading_jobs') || 'Loading jobs...'}</span>
          </div>
        </div>
      </>
    )
  }

  const workTypes: WorkType[] = ['construction', 'manufacturing', 'logistics_warehousing', 'agriculture', 'hospitality_tourism', 'cleaning_maintenance', 'care_household', 'transport_delivery', 'general_temporary', 'other']
  const languages: Language[] = ['en', 'de', 'sr', 'hr', 'bs', 'mk', 'sl', 'pl', 'bg', 'ro', 'el', 'sq', 'ar', 'uk']
  const experienceLevels: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced']
  
  const countryFilters = [
    { id: 'anywhere', name: t('anywhere_in_europe' as any) },
    { id: 'de', name: t('nationality_germany') || 'Germany' },
    { id: 'at', name: t('nationality_austria') || 'Austria' },
    { id: 'ch', name: t('nationality_switzerland') || 'Switzerland' },
  ]

  const clearFilters = () => {
    setFilters({
      work_types: [],
      languages: [],
      experience_levels: [],
      locations: [],
      cities: [],
      min_pay: '',
      max_pay: '',
      accommodation_included: false,
      food_included: false,
      include_negotiable: false,
      start_date_from: '',
      start_date_to: '',
      hide_applied: false,
    })
  }

  const hasActiveFilters = filters.work_types.length > 0 || filters.languages.length > 0 || 
    filters.experience_levels.length > 0 || filters.locations.length > 0 || filters.cities.length > 0 || 
    filters.min_pay || filters.max_pay || filters.accommodation_included || filters.food_included || 
    filters.start_date_from || filters.start_date_to || filters.hide_applied
  
  // Helper: is a job "completed" (applied or hired via direct offer)?
  const isJobCompleted = (jobId: string) =>
    appliedJobIds.has(jobId) || directOfferStatuses.get(jobId) === 'hired'

  // Sort and filter jobs
  const sortedAndFilteredJobs = jobs
    .filter(job => !filters.hide_applied || !isJobCompleted(job.id))
    .sort((a, b) => {
      const aCompleted = isJobCompleted(a.id)
      const bCompleted = isJobCompleted(b.id)
      if (aCompleted && !bCompleted) return 1
      if (!aCompleted && bCompleted) return -1
      return 0
    })

  const MAX_JOBS_WITHOUT_PROFILE = 5
  const profileComplete = isProfileComplete(workerProfile)
  const visibleJobs = profileComplete 
    ? sortedAndFilteredJobs 
    : sortedAndFilteredJobs.slice(0, MAX_JOBS_WITHOUT_PROFILE)
  const hasMoreJobs = !profileComplete && sortedAndFilteredJobs.length > MAX_JOBS_WITHOUT_PROFILE

  const toggleLocation = (location: string) => {
    setFilters(prev => ({
      ...prev,
      locations: prev.locations.includes(location)
        ? prev.locations.filter(l => l !== location)
        : [...prev.locations, location]
    }))
  }

  const addCity = (city: string) => {
    if (city.trim() && !filters.cities.includes(city.trim())) {
      setFilters(prev => ({
        ...prev,
        cities: [...prev.cities, city.trim()]
      }))
      setCityInput('')
    }
  }

  const removeCity = (city: string) => {
    setFilters(prev => ({
      ...prev,
      cities: prev.cities.filter(c => c !== city)
    }))
  }

  const availableCities = [...new Set(
    jobs
      .filter(job => job.location_city)
      .map(job => job.location_city!)
  )].sort()

  const toggleWorkType = (type: WorkType) => {
    setFilters(prev => ({
      ...prev,
      work_types: prev.work_types.includes(type)
        ? prev.work_types.filter(t => t !== type)
        : [...prev.work_types, type]
    }))
  }

  const toggleLanguage = (lang: Language) => {
    setFilters(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }))
  }

  const toggleExperience = (level: ExperienceLevel) => {
    setFilters(prev => ({
      ...prev,
      experience_levels: prev.experience_levels.includes(level)
        ? prev.experience_levels.filter(l => l !== level)
        : [...prev.experience_levels, level]
    }))
  }

  // Job Card Component
  const JobCard = ({ job, isSelected }: { job: JobPosting; isSelected: boolean }) => {
    const isApplied = appliedJobIds.has(job.id)
    const offerStatus = directOfferStatuses.get(job.id)
    const hasActiveOffer = offerStatus === 'offered'
    const isHiredOffer = offerStatus === 'hired'
    const isCompleted = isApplied || isHiredOffer
    
    return (
      <div 
        onClick={() => handleSelectJob(job)}
        data-testid={`job-card-${job.id}`}
        className={`group cursor-pointer bg-white rounded-2xl border transition-all duration-200 ${
          isSelected
            ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-lg'
            : isCompleted
              ? 'border-slate-200 opacity-60 hover:opacity-80'
              : 'border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5'
        }`}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            {/* Employer Profile Image or Fallback */}
            {job.employer_profile_image_url ? (
              <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 transition-all ${
                isSelected 
                  ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/25' 
                  : 'ring-1 ring-slate-200 group-hover:ring-blue-300'
              }`}>
                <img 
                  src={job.employer_profile_image_url} 
                  alt={job.company_name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                isSelected 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25' 
                  : 'bg-slate-100 group-hover:bg-blue-50'
              }`}>
                <Briefcase className={`w-5 h-5 transition-colors ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className={`font-semibold text-slate-900 leading-tight transition-colors line-clamp-2 ${
                isSelected ? 'text-blue-600' : 'group-hover:text-blue-600'
              }`}>
                {job.title}
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-500 truncate">{job.company_name}</span>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${
              isSelected 
                ? 'text-blue-500' 
                : 'text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5'
            }`} />
          </div>
          
          {/* Location */}
          {job.location_city && (
            <div className="flex items-center gap-1.5 mt-3 text-sm text-slate-500">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{job.location_city}{job.location_country && `, ${translateCountryCode(job.location_country, language)}`}</span>
            </div>
          )}
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
              {job.salary_range
                ? t(`salary_${job.salary_range}` as any) || job.salary_range.replace(/_/g, ' ')
                : job.pay_netto && job.pay_netto > 0
                  ? `€${job.pay_netto}`
                  : t('salary_negotiable')}
            </span>
            {job.accommodation_included && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                <Home className="w-3 h-3" />
              </span>
            )}
            {job.food_included && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                <Utensils className="w-3 h-3" />
              </span>
            )}
            {job.work_permit_sponsorship_offered && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                <FileCheck className="w-3 h-3" />
              </span>
            )}
            {isApplied && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                {t('applied')}
              </span>
            )}
            {hasActiveOffer && !isApplied && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium border border-amber-200">
                <Mail className="w-3 h-3" />
                {t('offer_received')}
              </span>
            )}
            {isHiredOffer && !isApplied && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                {t('hired')}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Filter Section Component
  const FilterSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )

  // Filter Dropdown Button
  const FilterDropdownButton = ({ 
    onClick, 
    isOpen, 
    hasSelection, 
    placeholder, 
    selectionText 
  }: { 
    onClick: () => void
    isOpen: boolean
    hasSelection: boolean
    placeholder: string
    selectionText: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-4 py-3 text-sm border rounded-xl bg-white text-left transition-all flex items-center justify-between ${
        isOpen 
          ? 'border-blue-500 ring-2 ring-blue-500/20' 
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <span className={hasSelection ? 'text-slate-800 font-medium' : 'text-slate-400'}>
        {hasSelection ? selectionText : placeholder}
      </span>
      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )

  // Selected Tags
  const SelectedTags = ({ items, onRemove, renderLabel }: { 
    items: string[]
    onRemove: (item: string) => void
    renderLabel: (item: string) => React.ReactNode
  }) => {
    if (items.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {items.map(item => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg"
          >
            {renderLabel(item)}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(item); }}
              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
    <div className={isPanelOpen ? 'hidden lg:block' : ''}>
      <Navbar />
    </div>
    <ProfileTooltip />
      
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-100 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 px-5 py-3 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium">{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      <CompleteProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        jobTitle={pendingJobTitle}
      />
      
      <ApplyJobModal
        isOpen={showApplyModal}
        onClose={handleCloseApplyModal}
        onApply={handleSubmitApplication}
        job={applyingJob}
        applying={applying === applyingJob?.id}
        initialPhone={(user?.user_metadata?.contact_phone as string) || user?.phone || ''}
      />
      
      {/* Unified Responsive Layout */}
      <div className="lg:h-[calc(100vh-64px)] lg:flex">
        {/* Filters Sidebar - Desktop only */}
        <div className={`hidden lg:block flex-shrink-0 bg-slate-100 border-r border-slate-200 overflow-hidden transition-all duration-300 ${
          isPanelOpen ? 'w-64' : 'w-72 xl:w-80'
        }`}>
          <div className="h-full overflow-y-auto scrollbar-auto-hide">
            {/* Filter Header */}
            <div className="sticky top-0 bg-slate-100 z-10 px-5 py-4 border-b border-slate-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                    <Filter className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{t('filters') || 'Filters'}</h2>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {t('clear_all') || 'Clear all'}
                  </button>
                )}
              </div>
            </div>

            {/* Filter Content */}
            <div className="p-5 space-y-6">
              {/* Work Type */}
              <FilterSection label={t('sector')}>
                <div className="relative">
                  <FilterDropdownButton
                    onClick={() => setShowWorkTypeDropdown(!showWorkTypeDropdown)}
                    isOpen={showWorkTypeDropdown}
                    hasSelection={filters.work_types.length > 0}
                    placeholder={t('select_types')}
                    selectionText={`${filters.work_types.length} ${t('selected_count') || 'selected'}`}
                  />
                  
                  {showWorkTypeDropdown && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                      <div className="p-2">
                        {workTypes.map(type => (
                          <label
                            key={type}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={filters.work_types.includes(type)}
                              onChange={() => toggleWorkType(type)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <span className="text-sm text-slate-900">{t(type)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <SelectedTags
                    items={filters.work_types}
                    onRemove={(type) => toggleWorkType(type as WorkType)}
                    renderLabel={(type) => t(type as WorkType)}
                  />
                </div>
              </FilterSection>

              {/* City */}
              <FilterSection label={t('city')}>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={cityInput}
                      onChange={(e) => {
                        setCityInput(e.target.value)
                        setShowCityDropdown(true)
                      }}
                      onFocus={() => setShowCityDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && cityInput.trim()) {
                          e.preventDefault()
                          addCity(cityInput)
                        }
                      }}
                      placeholder={t('search_city' as any) || "Search city..."}
                      className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  
                  {showCityDropdown && cityInput && availableCities.filter(c => 
                    c.toLowerCase().includes(cityInput.toLowerCase()) && !filters.cities.includes(c)
                  ).length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      <div className="p-2">
                        {availableCities
                          .filter(c => c.toLowerCase().includes(cityInput.toLowerCase()) && !filters.cities.includes(c))
                          .slice(0, 8)
                          .map(city => (
                            <button
                              key={city}
                              type="button"
                              onClick={() => {
                                addCity(city)
                                setShowCityDropdown(false)
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-left"
                            >
                              <MapPin className="w-4 h-4 text-slate-500" />
                              <span className="text-sm text-slate-900">{city}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  <SelectedTags
                    items={filters.cities}
                    onRemove={removeCity}
                    renderLabel={(city) => (
                      <>
                        <MapPin className="w-3 h-3" />
                        {city}
                      </>
                    )}
                  />
                </div>
              </FilterSection>

              {/* Language */}
              <FilterSection label={t('language')}>
                <div className="relative">
                  <FilterDropdownButton
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    isOpen={showLanguageDropdown}
                    hasSelection={filters.languages.length > 0}
                    placeholder={t('select_languages')}
                    selectionText={`${filters.languages.length} ${t('selected_count') || 'selected'}`}
                  />
                  
                  {showLanguageDropdown && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                      <div className="p-2">
                        {languages.map(lang => (
                          <label
                            key={lang}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={filters.languages.includes(lang)}
                              onChange={() => toggleLanguage(lang)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <FlagIcon code={languageDisplay[lang].flag} />
                            <span className="text-sm text-slate-900">{languageDisplay[lang].name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <SelectedTags
                    items={filters.languages}
                    onRemove={(lang) => toggleLanguage(lang as Language)}
                    renderLabel={(lang) => (
                      <>
                        <FlagIcon code={languageDisplay[lang as Language].flag} />
                        {languageDisplay[lang as Language].name}
                      </>
                    )}
                  />
                </div>
              </FilterSection>

              {/* Experience Level */}
              <FilterSection label={t('experience_level')}>
                <div className="relative">
                  <FilterDropdownButton
                    onClick={() => setShowExperienceDropdown(!showExperienceDropdown)}
                    isOpen={showExperienceDropdown}
                    hasSelection={filters.experience_levels.length > 0}
                    placeholder={t('select_levels')}
                    selectionText={`${filters.experience_levels.length} ${t('selected_count') || 'selected'}`}
                  />
                  
                  {showExperienceDropdown && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl">
                      <div className="p-2">
                        {experienceLevels.map(level => (
                          <label
                            key={level}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={filters.experience_levels.includes(level)}
                              onChange={() => toggleExperience(level)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <span className="text-sm text-slate-900 capitalize">{t(level)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <SelectedTags
                    items={filters.experience_levels}
                    onRemove={(level) => toggleExperience(level as ExperienceLevel)}
                    renderLabel={(level) => <span className="capitalize">{t(level as ExperienceLevel)}</span>}
                  />
                </div>
              </FilterSection>

              {/* Divider */}
              <div className="h-px bg-slate-100" />

              {/* Salary Range */}
              <FilterSection label={t('salary_range')}>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min €"
                    value={filters.min_pay}
                    onChange={(e) => setFilters({ ...filters, min_pay: e.target.value })}
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <input
                    type="number"
                    placeholder="Max €"
                    value={filters.max_pay}
                    onChange={(e) => setFilters({ ...filters, max_pay: e.target.value })}
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <label className={`flex items-center gap-3 px-4 py-3 mt-2 rounded-xl border cursor-pointer transition-all ${
                  filters.include_negotiable
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={filters.include_negotiable}
                    onChange={(e) => setFilters({ ...filters, include_negotiable: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    filters.include_negotiable ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                  }`}>
                    {filters.include_negotiable && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <Euro className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-slate-700">{t('include_negotiable')}</span>
                </label>
              </FilterSection>

              {/* Benefits */}
              <FilterSection label={t('benefits_perks')}>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                    filters.accommodation_included
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={filters.accommodation_included}
                      onChange={(e) => setFilters({ ...filters, accommodation_included: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <Home className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-900">{t('accommodation_included')}</span>
                  </label>
                  <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                    filters.food_included 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={filters.food_included}
                      onChange={(e) => setFilters({ ...filters, food_included: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <Utensils className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-900">{t('food_included')}</span>
                  </label>
                </div>
              </FilterSection>

              {/* Hide Applied */}
              <FilterSection label={t('application_status') || 'Status'}>
                <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  filters.hide_applied 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={filters.hide_applied}
                    onChange={(e) => setFilters({ ...filters, hide_applied: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <CheckCircle2 className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-900">{t('hide_applied_jobs') || 'Hide applied jobs'}</span>
                </label>
              </FilterSection>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 lg:overflow-hidden transition-all duration-300">
          <div className="lg:h-full lg:overflow-y-auto lg:bg-white">
            {/* Header */}
            <div className="px-4 lg:px-6 py-5 lg:py-4 lg:sticky lg:top-0 lg:bg-white/95 lg:backdrop-blur-sm lg:z-10 lg:border-b lg:border-slate-100">
              {/* Mobile Header */}
              <div className="lg:hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">{t('browse_jobs') || 'Browse Jobs'}</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {sortedAndFilteredJobs.length} {sortedAndFilteredJobs.length === 1 ? (t('job_singular') || 'job') : (t('jobs_available') || 'jobs available')}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const params = new URLSearchParams()
                      if (filters.work_types.length) params.set('work_types', filters.work_types.join(','))
                      if (filters.languages.length) params.set('languages', filters.languages.join(','))
                      if (filters.experience_levels.length) params.set('experience_levels', filters.experience_levels.join(','))
                      if (filters.locations.length) params.set('locations', filters.locations.join(','))
                      if (filters.cities.length) params.set('cities', filters.cities.join(','))
                      if (filters.min_pay) params.set('min_pay', filters.min_pay)
                      if (filters.max_pay) params.set('max_pay', filters.max_pay)
                      if (filters.accommodation_included) params.set('accommodation_included', 'true')
                      if (filters.food_included) params.set('food_included', 'true')
                      if (filters.include_negotiable) params.set('include_negotiable', 'true')
                      if (filters.start_date_from) params.set('start_date_from', filters.start_date_from)
                      if (filters.start_date_to) params.set('start_date_to', filters.start_date_to)
                      if (filters.hide_applied) params.set('hide_applied', 'true')
                      router.push(`/worker/jobs/filter?${params.toString()}`)
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:border-blue-300 transition-all shadow-sm"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>{t('filters') || 'Filters'}</span>
                    {hasActiveFilters && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </button>
                </div>
              </div>
              {/* Desktop Header */}
              <div className="hidden lg:block">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">{t('available_jobs') || 'Available Jobs'}</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      <span className="font-semibold text-blue-600">{sortedAndFilteredJobs.length}</span> {sortedAndFilteredJobs.length === 1 ? (t('job_singular') || 'job') : (t('jobs_found') || 'jobs found')}
                      {filters.hide_applied && appliedJobIds.size > 0 && (
                        <span className="text-slate-400 ml-1">
                          · {appliedJobIds.size} {t('hidden') || 'hidden'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner: Direct offers from employers (orange) */}
            {directOfferCount > 0 && (
              <div className="px-4 lg:px-6 pt-4 lg:pt-4">
                <div
                  onClick={() => router.push('/worker/job-offers')}
                  className="cursor-pointer bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                    <Mail className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-amber-900">{t('job_offers')}</span>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-bold rounded-full">{directOfferCount}</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-0.5">{t('employer_sent_offer_description')}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </div>
            )}

            {/* Banner: Application responses waiting (blue) */}
            {applicationOfferedCount > 0 && (
              <div className="px-4 lg:px-6 pt-4 lg:pt-4">
                <div
                  onClick={() => router.push('/worker/applications?filter=offered')}
                  className="cursor-pointer bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-900">{t('action_required')}</span>
                      <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-bold rounded-full">{applicationOfferedCount}</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-0.5">{t('action_required_offers_desc')}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </div>
            )}

            {/* Job Cards - Single render for both mobile and desktop */}
            <div className="px-4 lg:px-6 pb-24 lg:pb-6">
              <div className="space-y-3 lg:space-y-4">
                {visibleJobs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 lg:p-10 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-lg font-semibold text-slate-800 mb-2">{t('no_jobs_found')}</p>
                    <p className="text-sm text-slate-500 mb-5">{t('try_adjusting_filters')}</p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-xl font-medium hover:bg-blue-700 transition-colors"
                      >
                        {t('clear_filters')}
                      </button>
                    )}
                  </div>
                ) : (
                  visibleJobs.map((job, index) => (
                    <div 
                      key={job.id}
                      className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <JobCard job={job} isSelected={displayedJob?.id === job.id} />
                    </div>
                  ))
                )}

                {/* Profile CTA for incomplete profile */}
                {hasMoreJobs && (
                  <div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-8 flex flex-col items-center text-center">
                        {/* Icon */}
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/25">
                          <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full mb-4">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                            +{sortedAndFilteredJobs.length - MAX_JOBS_WITHOUT_PROFILE} {t('more_jobs') || 'more jobs'}
                          </span>
                        </div>
                        
                        {/* Text */}
                        <h3 className="text-lg font-bold text-slate-900 mb-2">
                          {t('create_profile_to_see_more') || 'Complete Your Profile'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6 max-w-md">
                          {t('complete_profile_message') || 'Unlock access to all available job opportunities and connect with employers.'}
                        </p>
                        
                        {/* Benefits */}
                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t('instant_apply') || 'Instant Apply'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t('direct_contact') || 'Direct Contact'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t('all_jobs') || 'All Jobs'}
                          </span>
                        </div>
                        
                        {/* CTA Button */}
                        <Link
                          href="/worker/profile"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5"
                        >
                          <span>{t('create_profile') || 'Create Profile'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile backdrop overlay */}
        {isPanelOpen && displayedJob && (
          <div 
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
            onClick={handleCloseJobDetail}
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
              onClose={handleCloseJobDetail}
              onApply={handleApply}
              applying={applying}
              hasApplied={appliedJobIds.has(displayedJob.id)}
              offerStatus={directOfferStatuses.get(displayedJob.id)}
              t={t}
              language={language}
            />
          )}
        </div>
      </div>
    </div>
  )
}

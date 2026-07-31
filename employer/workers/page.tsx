'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import Link from 'next/link'
import { getWorkers, getEmployerProfile, createNotification, getJobPostings, createJobPosting } from '@/lib/db'
import { getDirectOffersForEmployer } from '@/lib/db/optimized'
import type { WorkerProfile, WorkType, ExperienceLevel, Language, JobPosting, JobType, WorkAuthorizationStatus } from '@/lib/types'
import type { TranslationKey } from '@/lib/i18n'
import dynamic from 'next/dynamic'
const ContactWorkerModal = dynamic(() => import('@/components/employer/ContactWorkerModal').then(m => ({ default: m.ContactWorkerModal })), { ssr: false })
const CreateJobModal = dynamic(() => import('@/components/employer/CreateJobModal').then(m => ({ default: m.CreateJobModal })), { ssr: false })
import { Toast, type ToastType } from '@/components/ui/Toast'
import { logError } from '@/lib/logger'
import type { JobFormData } from '@/hooks/useEmployerJobs'
import { 
  FilterPanel,
  FilterSection,
  FilterDropdownButton,
  SelectedTags,
  AnimatedDropdown,
  CheckboxItem,
  ToggleCheckbox,
} from '@/components/shared/FilterPanel'
import { 
  Search, 
  Filter, 
  Users, 
  Briefcase, 
  Globe, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X, 
  MapPin,
  Calendar,
  FileCheck,
  Award,
  Send,
  Shield,
  Home,
  HelpCircle,
  HardHat,
  Factory,
  Package,
  Wheat,
  Hotel,
  Sparkles,
  Heart,
  Truck,
  Wrench,
  Languages
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


/**
 * WorkAuthBadge - Displays work authorization status badge on worker cards
 */
const WorkAuthBadge: React.FC<{
  status: WorkAuthorizationStatus
  countries?: string[]
  t: (key: any) => string
}> = ({ status, countries, t }) => {
  // Configuration for each status
  const config: Record<WorkAuthorizationStatus, {
    icon: React.ElementType
    bgColor: string
    textColor: string
    label: string
  }> = {
    eu_citizen: {
      icon: Shield,
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-700',
      label: t('work_auth_eu_citizen_short')
    },
    permanent_resident: {
      icon: Home,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      label: t('work_auth_resident_short')
    },
    work_permit_holder: {
      icon: Briefcase,
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      label: t('work_auth_permit_short')
    },
    needs_sponsorship: {
      icon: HelpCircle,
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-600',
      label: t('work_auth_sponsorship_short')
    }
  }

  const { icon: Icon, bgColor, textColor, label } = config[status]

  return (
    <span className={`px-2 py-1 ${bgColor} ${textColor} rounded-lg text-xs font-medium flex items-center gap-1`}>
      {status !== 'work_permit_holder' && <Icon className="w-3 h-3" />}
      {status === 'eu_citizen' ? (
        <span>{label}</span>
      ) : countries && countries.length > 0 ? (
        <span className="flex items-center gap-0.5">
          {countries.slice(0, 3).map(c => <FlagIcon key={c} code={c} size="xs" />)}
          {countries.length > 3 && <span className="ml-0.5">+{countries.length - 3}</span>}
        </span>
      ) : (
        <span>{label}</span>
      )}
    </span>
  )
}

// Worker Detail Panel Component (for mobile sliding panel)
function WorkerDetailPanel({
  worker,
  onClose,
  onContact,
  contacting,
  contacted,
  t,
  language,
  languageDisplay,
  locationFilters,
}: {
  worker: WorkerProfile | null
  onClose: () => void
  onContact: (worker: WorkerProfile) => void
  contacting: boolean
  contacted: boolean
  t: (key: any) => string
  language: string
  languageDisplay: Record<Language, { flag: string; name: string }>
  locationFilters: { id: string; name: string }[]
}) {
  const [translations, setTranslations] = useState<Record<string, { text: string; loading: boolean; error: boolean; visible: boolean } | null>>({})

  // Reset translations when worker changes
  useEffect(() => {
    setTranslations({})
  }, [worker?.id])

  const handleTranslate = async (field: string, content: string) => {
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
      setTranslations(prev => ({
        ...prev,
        [field]: { text: data.translatedText, loading: false, error: false, visible: true },
      }))
    } catch {
      setTranslations(prev => ({
        ...prev,
        [field]: { text: '', loading: false, error: true, visible: false },
      }))
    }
  }

  if (!worker) return null

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {worker.profile_image_url ? (
              <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-slate-100 shadow-lg">
                <img
                  src={worker.profile_image_url}
                  alt={worker.full_name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white text-lg font-bold">
                  {worker.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{worker.full_name}</h2>
              {worker.work_types && worker.work_types.length > 0 && (
                <p className="text-sm text-slate-500 mt-1">{t(worker.work_types[0])}</p>
              )}
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
          {worker.preferred_locations && worker.preferred_locations.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium">
              {worker.preferred_locations[0] === 'anywhere' ? (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  {t('anywhere_in_europe' as any) || 'Anywhere'}
                </>
              ) : worker.preferred_locations[0]?.startsWith('anywhere:') ? (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  {(() => {
                    const cc = worker.preferred_locations[0].replace('anywhere:', '')
                    const country = locationFilters.find(l => l.id === cc)
                    return country ? <><FlagIcon code={country.id} size="xs" /> {country.name}</> : <>{worker.preferred_locations[0]}</>
                  })()}
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5" />
                  {locationFilters.find(l => l.id === worker.preferred_locations?.[0])?.name || worker.preferred_locations[0]}
                </>
              )}
            </span>
          )}
          {worker.work_authorization && worker.work_authorization.status && (
            <WorkAuthBadge 
              status={worker.work_authorization.status} 
              countries={worker.work_authorization.countries} 
              t={t} 
            />
          )}
          {worker.available_immediately && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              {t('available_immediately')}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Bio */}
          {worker.bio && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('about')}</h3>
                <button
                  onClick={() => handleTranslate('bio', worker.bio!)}
                  disabled={translations.bio?.loading}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-50"
                >
                  <Languages className="w-3 h-3" />
                  <span>
                    {translations.bio?.loading
                      ? t('translating')
                      : translations.bio?.error
                        ? t('translation_failed')
                        : translations.bio?.visible
                          ? t('show_original')
                          : t('translate')}
                  </span>
                </button>
              </div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {translations.bio?.visible ? translations.bio.text : worker.bio}
              </p>
            </div>
          )}

          {/* Experience */}
          {worker.experience && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('experience')}</h3>
                <button
                  onClick={() => handleTranslate('experience', worker.experience!)}
                  disabled={translations.experience?.loading}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-50"
                >
                  <Languages className="w-3 h-3" />
                  <span>
                    {translations.experience?.loading
                      ? t('translating')
                      : translations.experience?.error
                        ? t('translation_failed')
                        : translations.experience?.visible
                          ? t('show_original')
                          : t('translate')}
                  </span>
                </button>
              </div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {translations.experience?.visible ? translations.experience.text : worker.experience}
              </p>
            </div>
          )}

          {/* Languages */}
          {worker.languages && worker.languages.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('languages')}</h3>
              <div className="flex flex-wrap gap-2">
                {worker.languages.map((lang) => {
                  const langInfo = languageDisplay[lang]
                  return (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl font-medium text-sm border border-blue-100"
                    >
                      <FlagIcon code={langInfo?.flag ?? ''} />
                      <span>{langInfo?.name}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Work Types */}
          {worker.work_types && worker.work_types.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('sectors')}</h3>
              <div className="flex flex-wrap gap-2">
                {worker.work_types.map((type) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 rounded-xl font-medium text-sm border border-slate-200"
                  >
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    {t(type)}
                  </span>
                ))}
              </div>
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
                    className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl font-medium text-sm border border-amber-100"
                  >
                    <Award className="w-4 h-4" />
                    {getCertificateName(cert, t)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Action Buttons */}
      <div className="flex-shrink-0 p-6 border-t border-slate-100 bg-white space-y-3">
        <Link
          href={`/worker/view-profile?id=${worker.id}`}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 text-sm rounded-xl font-semibold hover:bg-slate-200 transition-all border border-slate-200"
        >
          {t('view_profile')}
        </Link>
        <button
          onClick={() => onContact(worker)}
          disabled={contacting || contacted}
          className={`w-full px-6 py-4 text-base rounded-xl font-semibold transition-all duration-300 ${
            contacted
              ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
              : contacting
                ? 'bg-blue-500 text-white'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5'
          }`}
        >
          {contacting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t('loading')}
            </span>
          ) : contacted ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('sent' as any) || 'Offer Sent'}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              {t('send_offer' as any) || 'Send Job Offer'}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

export default function EmployerWorkersPage() {
  const { user, role, loading: authLoading } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  const [workers, setWorkers] = useState<WorkerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [contactedWorkers, setContactedWorkers] = useState<Set<string>>(new Set())
  // Maps workerId -> Set of jobIds already offered to that worker
  const [sentOffersByWorker, setSentOffersByWorker] = useState<Map<string, Set<string>>>(new Map())
  const [contacting, setContacting] = useState<string | null>(null)
  const [showContactModal, setShowContactModal] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null)
  const [selectedWorkerApplications, setSelectedWorkerApplications] = useState<any[]>([])
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [showCreateJobModal, setShowCreateJobModal] = useState(false)
  const [creatingJob, setCreatingJob] = useState(false)
  const [workerToNotify, setWorkerToNotify] = useState<WorkerProfile | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    // company_name removed - comes from employer_profiles
    work_type: 'construction',
    years_of_experience: 0,
    salary_range: 'negotiable',
    certification_requirements: [],
    language_requirements: [],
    start_date: '',
    end_date: '',
    job_type: 'permanent' as JobType,
    accommodation_included: false,
    food_included: false,
    location_city: '',
    location_country: '',
    location_address: '',
    positions_available: 1,
    work_permit_required: false,
    work_permit_sponsorship_offered: false,
  })
  
  // Advanced filter state
  const [filters, setFilters] = useState({
    work_types: [] as WorkType[],
    languages: [] as Language[],
    work_authorization_statuses: [] as WorkAuthorizationStatus[],
    work_authorization_countries: [] as string[],
    locations: [] as string[],
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showWorkTypeDropdown, setShowWorkTypeDropdown] = useState(false)
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showWorkAuthDropdown, setShowWorkAuthDropdown] = useState(false)
  const [showWorkAuthCountryDropdown, setShowWorkAuthCountryDropdown] = useState(false)
  const [workAuthCountrySearchQuery, setWorkAuthCountrySearchQuery] = useState('')
  const [showFiltersMobile, setShowFiltersMobile] = useState(false)
  const [showFiltersDesktop, setShowFiltersDesktop] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Worker detail panel state
  const [selectedWorker2, setSelectedWorker2] = useState<WorkerProfile | null>(null)
  const [displayedWorker, setDisplayedWorker] = useState<WorkerProfile | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

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

  // Auth is handled by the employer layout
  useEffect(() => {
    if (user && role === 'employer') {
      loadWorkers()
      loadJobs()
    }
  }, [user, role, filters, searchQuery])

  const loadJobs = async () => {
    if (!user) return
    const employerProfile = await getEmployerProfile(user.id)
    if (!employerProfile) return
    
    const allJobs = await getJobPostings()
    const myJobs = allJobs.filter(job => job.employer_id === employerProfile.id)
    setJobs(myJobs)
    
    // Load existing direct offers from job_applications to initialize contactedWorkers and sentOffersByWorker
    const existingOffers = await getDirectOffersForEmployer(employerProfile.id)
    const contactedIds = new Set(existingOffers.map(offer => offer.worker_id).filter(Boolean) as string[])
    setContactedWorkers(contactedIds)
    const offerMap = new Map<string, Set<string>>()
    for (const offer of existingOffers) {
      if (!offer.worker_id) continue
      if (!offerMap.has(offer.worker_id)) offerMap.set(offer.worker_id, new Set())
      offerMap.get(offer.worker_id)!.add(offer.job_id)
    }
    setSentOffersByWorker(offerMap)
  }

  const loadWorkers = async () => {
    setLoading(true)
    const filterParams: any = {}
    
    // Apply filters
    if (filters.work_types.length > 0) filterParams.work_type = filters.work_types[0]
    if (filters.languages.length > 0) filterParams.language = filters.languages[0]
    
    let workerList = await getWorkers(filterParams)
    
    // Client-side filtering for multiple selections
    if (filters.work_types.length > 0) {
      workerList = workerList.filter(worker => 
        filters.work_types.some(type => worker.work_types.includes(type))
      )
    }
    if (filters.languages.length > 0) {
      workerList = workerList.filter(worker => 
        filters.languages.some(lang => worker.languages.includes(lang))
      )
    }
    // Filter by work authorization status
    if (filters.work_authorization_statuses.length > 0) {
      workerList = workerList.filter(worker => {
        if (!worker.work_authorization || !worker.work_authorization.status) {
          return false
        }
        
        const workerStatus = worker.work_authorization.status
        
        // Check if worker's status matches any selected status
        if (!filters.work_authorization_statuses.includes(workerStatus)) {
          return false
        }
        
        // If filtering by permanent_resident or work_permit_holder, also check countries if specified
        if (workerStatus === 'permanent_resident' || workerStatus === 'work_permit_holder') {
          // If countries are specified, worker must have authorization in at least one of them
          if (filters.work_authorization_countries.length > 0) {
            const workerCountries = worker.work_authorization.countries || []
            return filters.work_authorization_countries.some(country => 
              workerCountries.includes(country)
            )
          }
          // If no countries specified, show all workers with this status
          return true
        }
        
        // For eu_citizen and needs_sponsorship, no country filtering needed
        return true
      })
    }
    if (filters.locations.length > 0) {
      workerList = workerList.filter(worker => {
        if (!worker.preferred_locations || worker.preferred_locations.length === 0) return false
        
        // Check if worker matches any selected location filter
        return filters.locations.some(filterLoc => {
          // If filtering by "anywhere", match workers who selected "anywhere"
          if (filterLoc === 'anywhere') {
            return worker.preferred_locations?.some(loc => loc === 'anywhere')
          }
          
          // If filtering by country code (de, at, ch), match workers who:
          // - Selected "anywhere:countryCode" OR
          // - Selected specific cities in that country (city:countryCode) OR
          // - Selected "anywhere" (flexible for any country)
          return worker.preferred_locations?.some(loc => {
            if (loc === 'anywhere') return true
            if (loc === `anywhere:${filterLoc}`) return true
            if (loc.endsWith(`:${filterLoc}`)) return true
            return false
          })
        })
      })
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      workerList = workerList.filter(worker => 
        worker.full_name.toLowerCase().includes(query) ||
        worker.bio?.toLowerCase().includes(query) ||
        worker.work_types.some(type => t(type).toLowerCase().includes(query)) ||
        worker.languages.some(lang => languageDisplay[lang]?.name.toLowerCase().includes(query))
      )
    }
    
    setWorkers(workerList)
    setLoading(false)
  }

  const handleContact = async (worker: WorkerProfile) => {
    if (!user) return
    
    const employerProfile = await getEmployerProfile(user.id)
    if (!employerProfile) {
      alert('Please create your employer profile first')
      router.push('/employer/profile')
      return
    }
    
    // Fetch this worker's applications to our jobs
    try {
      const { getWorkerApplicationsToEmployer } = await import('@/lib/db/applications')
      const apps = await getWorkerApplicationsToEmployer(worker.id, employerProfile.id)
      setSelectedWorkerApplications(apps)
    } catch {
      setSelectedWorkerApplications([])
    }

    setSelectedWorker(worker)
    setShowContactModal(true)
  }

  const handleSendJobOffer = async (jobId: string) => {
    if (!user || !selectedWorker) return
    
    setContacting(selectedWorker.id)
    
    try {
      const employerProfile = await getEmployerProfile(user.id)
      if (!employerProfile) return
      
      // Worker id is the same as their auth user id
      if (!selectedWorker.id) {
        alert('Error: Worker profile is missing user information')
        setContacting(null)
        return
      }

      const job = jobs.find(j => j.id === jobId)
      if (!job) {
        alert('Job not found')
        setContacting(null)
        return
      }

      const { sendDirectOffer } = await import('@/lib/db/applications')
      const result = await sendDirectOffer(jobId, selectedWorker.id)

      if (result.success) {
        setContactedWorkers(prev => new Set(prev).add(selectedWorker.id))
        setSentOffersByWorker(prev => {
          const next = new Map(prev)
          if (!next.has(selectedWorker.id)) next.set(selectedWorker.id, new Set())
          next.get(selectedWorker.id)!.add(jobId)
          return next
        })
        setShowContactModal(false)
        setSelectedWorker(null)
        setToast({ message: `Job offer sent to ${selectedWorker.full_name}!`, type: 'success' })
      } else {
        const errorMsg = result.error === 'worker_already_applied'
          ? 'This worker has already applied to this position.'
          : result.error === 'worker_declined_offer'
            ? 'This worker has previously declined an offer for this position and cannot be re-offered.'
            : result.error === 'no_positions_available'
              ? 'No positions are available for this job. All positions have been filled.'
              : result.error === 'job_not_active'
                ? 'This job posting is no longer active.'
                : 'Failed to send job offer. Please try again.'
        setToast({ message: errorMsg, type: 'error' })
      }
    } catch (error) {
      logError('EmployerWorkers', error, undefined, 'Error sending job offer')
      setToast({ message: 'Failed to send job offer. Please try again.', type: 'error' })
    } finally {
      setContacting(null)
    }
  }

  const handleMessageDirectly = async (message: string) => {
    if (!user || !selectedWorker) return
    
    setContacting(selectedWorker.id)
    
    try {
      const { createDirectConversation } = await import('@/lib/db')
      const conversation = await createDirectConversation(selectedWorker.id, message)
      
      if (conversation) {
        setShowContactModal(false)
        setSelectedWorker(null)
        setToast({ message: `Message sent to ${selectedWorker.full_name}!`, type: 'success' })
        // Navigate to the conversation
        router.push(`/messages?conversationId=${conversation.id}`)
      } else {
        setToast({ message: 'Failed to send message. Please try again.', type: 'error' })
      }
    } catch (error) {
      logError('EmployerWorkers', error, undefined, 'Error sending direct message')
      setToast({ message: 'Failed to send message. Please try again.', type: 'error' })
    } finally {
      setContacting(null)
    }
  }

  const handleCreateNewJobForWorker = async () => {
    if (!user) return
    
    const employerProfile = await getEmployerProfile(user.id)
    if (!employerProfile) return
    
    setFormData({
      title: '',
      description: '',
      // Default to employer's industry, fallback to 'construction'
      work_type: employerProfile.industry || 'construction',
      years_of_experience: 0,
      salary_range: 'negotiable',
      certification_requirements: [],
      language_requirements: [],
      start_date: '',
      end_date: '',
      job_type: 'permanent' as JobType,
      accommodation_included: false,
      food_included: false,
      location_city: '',
      location_country: '',
      location_address: '',
      positions_available: 1,
      work_permit_required: false,
      work_permit_sponsorship_offered: false,
    })
    
    setWorkerToNotify(selectedWorker)
    setShowContactModal(false)
    setShowCreateJobModal(true)
  }

  const updateFormField = <K extends keyof JobFormData>(field: K, value: JobFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || creatingJob) return
    
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields')
      return
    }

    if (!formData.salary_range) {
      alert('Please select a salary range')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    if (formData.start_date && formData.start_date < today) {
      alert(t('start_date_not_in_past'))
      return
    }

    if (formData.end_date && formData.start_date && formData.end_date <= formData.start_date) {
      alert(t('end_date_after_start'))
      return
    }

    setCreatingJob(true)
    
    try {
      const employerProfile = await getEmployerProfile(user.id)
      if (!employerProfile) {
        alert('Employer profile not found')
        setCreatingJob(false)
        return
      }
      
      // When creating a job for a specific worker, make it private
      // Private jobs are only visible to the worker who receives the job offer
      const isPrivateJob = workerToNotify !== null
      
      const jobData = {
        employer_id: employerProfile.id,
        ...formData,
        // Convert empty date strings to null for PostgreSQL DATE columns
        end_date: formData.end_date || null,
        visibility: isPrivateJob ? 'private' as const : 'public' as const,
        status: 'active' as const,
      }
      
      const newJob = await createJobPosting(jobData)
      
      if (newJob) {
        await loadJobs()
        
        if (workerToNotify) {
          const { sendDirectOffer } = await import('@/lib/db/applications')
          const result = await sendDirectOffer(newJob.id, workerToNotify.id)

          if (result.success) {
            setContactedWorkers(prev => new Set(prev).add(workerToNotify.id))
            setToast({ message: `${t('job_created_offer_sent')} ${workerToNotify.full_name}!`, type: 'success' })
          } else {
            setToast({ message: `${t('job_created_offer_failed')} ${workerToNotify.full_name}.`, type: 'info' })
          }
        } else {
          setToast({ message: t('job_posting_created_successfully'), type: 'success' })
        }
        
        setShowCreateJobModal(false)
        setWorkerToNotify(null)
        setFormData({
          title: '',
          description: '',
          work_type: 'construction',
          years_of_experience: 0,
          salary_range: 'negotiable',
          certification_requirements: [],
          language_requirements: [],
          start_date: '',
          end_date: '',
          job_type: 'permanent' as JobType,
          accommodation_included: false,
          food_included: false,
          location_city: '',
          location_country: '',
          location_address: '',
          positions_available: 1,
          work_permit_required: false,
          work_permit_sponsorship_offered: false,
        })
      } else {
        setToast({ message: 'Failed to create job posting', type: 'error' })
      }
    } catch (error) {
      logError('EmployerWorkers', error, undefined, 'Error creating job')
      setToast({ message: 'Failed to create job posting', type: 'error' })
    } finally {
      setCreatingJob(false)
    }
  }

  const handleCancelJobCreation = () => {
    setShowCreateJobModal(false)
    setWorkerToNotify(null)
    setFormData({
      title: '',
      description: '',
      work_type: 'construction',
      years_of_experience: 0,
      salary_range: 'negotiable',
      certification_requirements: [],
      language_requirements: [],
      start_date: '',
      end_date: '',
      job_type: 'permanent' as JobType,
      accommodation_included: false,
      food_included: false,
      location_city: '',
      location_country: '',
      location_address: '',
      positions_available: 1,
      work_permit_required: false,
      work_permit_sponsorship_offered: false,
    })
  }

  // Filter helpers
  const workTypes: WorkType[] = ['construction', 'manufacturing', 'logistics_warehousing', 'agriculture', 'hospitality_tourism', 'cleaning_maintenance', 'care_household', 'transport_delivery', 'general_temporary']
  const languages: Language[] = ['en', 'de', 'sr', 'hr', 'bs', 'mk', 'sl', 'pl', 'bg', 'ro', 'el', 'sq', 'ar', 'uk']
  // Country-based location filters - All European countries (id is ISO 3166-1 alpha-2 country code)
  const locationFilters = [
    { id: 'anywhere', name: t('anywhere_in_europe' as any) || 'Anywhere in Europe' },
    // Western Europe
    { id: 'de', name: 'Germany' },
    { id: 'at', name: 'Austria' },
    { id: 'ch', name: 'Switzerland' },
    { id: 'fr', name: 'France' },
    { id: 'be', name: 'Belgium' },
    { id: 'nl', name: 'Netherlands' },
    { id: 'lu', name: 'Luxembourg' },
    { id: 'li', name: 'Liechtenstein' },
    // Northern Europe
    { id: 'gb', name: 'United Kingdom' },
    { id: 'ie', name: 'Ireland' },
    { id: 'dk', name: 'Denmark' },
    { id: 'se', name: 'Sweden' },
    { id: 'no', name: 'Norway' },
    { id: 'fi', name: 'Finland' },
    { id: 'is', name: 'Iceland' },
    // Southern Europe
    { id: 'it', name: 'Italy' },
    { id: 'es', name: 'Spain' },
    { id: 'pt', name: 'Portugal' },
    { id: 'gr', name: 'Greece' },
    { id: 'mt', name: 'Malta' },
    { id: 'cy', name: 'Cyprus' },
    // Eastern Europe
    { id: 'pl', name: 'Poland' },
    { id: 'cz', name: 'Czech Republic' },
    { id: 'sk', name: 'Slovakia' },
    { id: 'hu', name: 'Hungary' },
    { id: 'ro', name: 'Romania' },
    { id: 'bg', name: 'Bulgaria' },
    { id: 'ua', name: 'Ukraine' },
    // Baltic States
    { id: 'ee', name: 'Estonia' },
    { id: 'lv', name: 'Latvia' },
    { id: 'lt', name: 'Lithuania' },
    // Balkans
    { id: 'si', name: 'Slovenia' },
    { id: 'hr', name: 'Croatia' },
    { id: 'ba', name: 'Bosnia and Herzegovina' },
    { id: 'rs', name: 'Serbia' },
    { id: 'me', name: 'Montenegro' },
    { id: 'mk', name: 'North Macedonia' },
    { id: 'al', name: 'Albania' },
    { id: 'xk', name: 'Kosovo' },
  ]

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

  const clearFilters = () => {
    setFilters({
      work_types: [],
      languages: [],
      work_authorization_statuses: [],
      work_authorization_countries: [],
      locations: [],
    })
    setWorkAuthCountrySearchQuery('')
  }

  const hasActiveFilters = filters.work_types.length > 0 || filters.languages.length > 0 || 
    filters.work_authorization_statuses.length > 0 || filters.work_authorization_countries.length > 0 ||
    filters.locations.length > 0

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

  const toggleLocation = (location: string) => {
    setFilters(prev => ({
      ...prev,
      locations: prev.locations.includes(location)
        ? prev.locations.filter(l => l !== location)
        : [...prev.locations, location]
    }))
  }

  const toggleWorkAuthStatus = (status: WorkAuthorizationStatus) => {
    setFilters(prev => {
      const newStatuses = prev.work_authorization_statuses.includes(status)
        ? prev.work_authorization_statuses.filter(s => s !== status)
        : [...prev.work_authorization_statuses, status]
      
      // If removing a status that needs countries, clear those countries if no other status needs them
      const needsCountriesStatuses = newStatuses.filter(s => 
        s === 'permanent_resident' || s === 'work_permit_holder'
      )
      
      return {
        ...prev,
        work_authorization_statuses: newStatuses,
        work_authorization_countries: needsCountriesStatuses.length === 0 ? [] : prev.work_authorization_countries
      }
    })
  }

  const toggleWorkAuthCountry = (country: string) => {
    setFilters(prev => ({
      ...prev,
      work_authorization_countries: prev.work_authorization_countries.includes(country)
        ? prev.work_authorization_countries.filter(c => c !== country)
        : [...prev.work_authorization_countries, country]
    }))
    setWorkAuthCountrySearchQuery('')
  }

  const removeWorkAuthCountry = (country: string) => {
    setFilters(prev => ({
      ...prev,
      work_authorization_countries: prev.work_authorization_countries.filter(c => c !== country)
    }))
  }

  // Work authorization options matching the worker profile creation page
  const WORK_AUTH_OPTIONS: { 
    status: WorkAuthorizationStatus
    labelKey: string
    descriptionKey: string
    icon: React.ElementType
    color: string
    needsCountries: boolean
  }[] = [
    { 
      status: 'eu_citizen', 
      labelKey: 'work_auth_eu_citizen',
      descriptionKey: 'work_auth_eu_citizen_desc',
      icon: Shield,
      color: 'emerald',
      needsCountries: false
    },
    { 
      status: 'permanent_resident', 
      labelKey: 'work_auth_permanent_resident',
      descriptionKey: 'work_auth_permanent_resident_desc',
      icon: Home,
      color: 'blue',
      needsCountries: true
    },
    { 
      status: 'work_permit_holder', 
      labelKey: 'work_auth_work_permit',
      descriptionKey: 'work_auth_work_permit_desc',
      icon: Briefcase,
      color: 'amber',
      needsCountries: true
    },
    { 
      status: 'needs_sponsorship', 
      labelKey: 'work_auth_needs_sponsorship',
      descriptionKey: 'work_auth_needs_sponsorship_desc',
      icon: HelpCircle,
      color: 'slate',
      needsCountries: false
    },
  ]

  // European countries for work authorization country selection
  const EUROPEAN_COUNTRIES = [
    { code: 'de', name: 'Germany', flag: '🇩🇪' },
    { code: 'at', name: 'Austria', flag: '🇦🇹' },
    { code: 'ch', name: 'Switzerland', flag: '🇨🇭' },
    { code: 'fr', name: 'France', flag: '🇫🇷' },
    { code: 'be', name: 'Belgium', flag: '🇧🇪' },
    { code: 'nl', name: 'Netherlands', flag: '🇳🇱' },
    { code: 'lu', name: 'Luxembourg', flag: '🇱🇺' },
    { code: 'li', name: 'Liechtenstein', flag: '🇱🇮' },
    { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'ie', name: 'Ireland', flag: '🇮🇪' },
    { code: 'dk', name: 'Denmark', flag: '🇩🇰' },
    { code: 'se', name: 'Sweden', flag: '🇸🇪' },
    { code: 'no', name: 'Norway', flag: '🇳🇴' },
    { code: 'fi', name: 'Finland', flag: '🇫🇮' },
    { code: 'is', name: 'Iceland', flag: '🇮🇸' },
    { code: 'it', name: 'Italy', flag: '🇮🇹' },
    { code: 'es', name: 'Spain', flag: '🇪🇸' },
    { code: 'pt', name: 'Portugal', flag: '🇵🇹' },
    { code: 'gr', name: 'Greece', flag: '🇬🇷' },
    { code: 'mt', name: 'Malta', flag: '🇲🇹' },
    { code: 'cy', name: 'Cyprus', flag: '🇨🇾' },
    { code: 'pl', name: 'Poland', flag: '🇵🇱' },
    { code: 'cz', name: 'Czech Republic', flag: '🇨🇿' },
    { code: 'sk', name: 'Slovakia', flag: '🇸🇰' },
    { code: 'hu', name: 'Hungary', flag: '🇭🇺' },
    { code: 'ro', name: 'Romania', flag: '🇷🇴' },
    { code: 'bg', name: 'Bulgaria', flag: '🇧🇬' },
    { code: 'ua', name: 'Ukraine', flag: '🇺🇦' },
    { code: 'ee', name: 'Estonia', flag: '🇪🇪' },
    { code: 'lv', name: 'Latvia', flag: '🇱🇻' },
    { code: 'lt', name: 'Lithuania', flag: '🇱🇹' },
    { code: 'si', name: 'Slovenia', flag: '🇸🇮' },
    { code: 'hr', name: 'Croatia', flag: '🇭🇷' },
    { code: 'ba', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
    { code: 'rs', name: 'Serbia', flag: '🇷🇸' },
    { code: 'me', name: 'Montenegro', flag: '🇲🇪' },
    { code: 'mk', name: 'North Macedonia', flag: '🇲🇰' },
    { code: 'al', name: 'Albania', flag: '🇦🇱' },
    { code: 'xk', name: 'Kosovo', flag: '🇽🇰' },
  ]

  const filteredWorkAuthCountries = EUROPEAN_COUNTRIES.filter(country => {
    if (filters.work_authorization_countries.includes(country.code)) return false
    if (!workAuthCountrySearchQuery.trim()) return true
    const query = workAuthCountrySearchQuery.toLowerCase()
    return country.name.toLowerCase().includes(query) || country.code.toLowerCase().includes(query)
  })

  const needsCountrySelection = filters.work_authorization_statuses.some(status => 
    status === 'permanent_resident' || status === 'work_permit_holder'
  )

  // Handle worker selection for detail panel
  const handleSelectWorker = (worker: WorkerProfile) => {
    setSelectedWorker2(worker)
    setDisplayedWorker(worker)
    setIsPanelOpen(true)
    setShowFiltersDesktop(false)
  }

  const handleCloseWorkerDetail = () => {
    setIsPanelOpen(false)
    setSelectedWorker2(null)
    setTimeout(() => {
      setDisplayedWorker(null)
    }, 300)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-sm font-medium text-slate-500">{t('loading_workers')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="workers-page">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Unified Responsive Layout */}
      <div className="lg:flex min-h-[calc(100vh-71px)]">
        {/* Filter expand tab - visible only when collapsed */}
        {!showFiltersDesktop && (
          <div className="hidden lg:flex items-start relative z-10">
            <button
              onClick={() => setShowFiltersDesktop(true)}
              className="absolute top-4 left-0 flex items-center gap-1 pl-1.5 pr-2 py-2 bg-white border border-l-0 border-slate-200 rounded-r-lg shadow-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
              title={t('show_filters' as any) || 'Show filters'}
            >
              <ChevronRight className="w-4 h-4" />
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sticky Sidebar Filter - Desktop only */}
        <div className={`hidden lg:flex flex-shrink-0 flex-col bg-white border-r border-slate-200 transition-all duration-300 ${showFiltersDesktop ? (isPanelOpen ? 'w-64' : 'w-[320px] xl:w-[360px]') : 'w-0 overflow-hidden'}`}>
          {/* Filter Header */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <Filter className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-800 whitespace-nowrap">{t('filter')}</h2>
                  {hasActiveFilters && (
                    <p className="text-xs text-slate-500">{t('active')}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
                  >
                    {t('clear_all')}
                  </button>
                )}
                <button
                  onClick={() => setShowFiltersDesktop(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  title={t('hide_filters' as any) || 'Hide filters'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Sectors */}
            <FilterSection label={t('sectors')}>
              <div className="relative">
                <FilterDropdownButton
                      onClick={() => {
                        setShowWorkTypeDropdown(!showWorkTypeDropdown)
                        setShowLanguageDropdown(false)
                        setShowLocationDropdown(false)
                        setShowWorkAuthDropdown(false)
                        setShowWorkAuthCountryDropdown(false)
                      }}
                  isOpen={showWorkTypeDropdown}
                  hasSelection={filters.work_types.length > 0}
                  placeholder={t('select_types') || t('any')}
                  selectionText={`${filters.work_types.length} selected`}
                />
                
                <AnimatedDropdown isOpen={showWorkTypeDropdown}>
                            {workTypes.map(type => (
                    <CheckboxItem
                                key={type}
                                  checked={filters.work_types.includes(type)}
                                  onChange={() => toggleWorkType(type)}
                      label={t(type)}
                    />
                  ))}
                </AnimatedDropdown>
                
                <SelectedTags
                  items={filters.work_types}
                  onRemove={(type) => toggleWorkType(type as WorkType)}
                  renderLabel={(type) => t(type as WorkType)}
                  accentColor="slate"
                />
                      </div>
            </FilterSection>

                {/* Languages */}
            <FilterSection label={t('languages')}>
              <div className="relative">
                <FilterDropdownButton
                      onClick={() => {
                        setShowLanguageDropdown(!showLanguageDropdown)
                        setShowWorkTypeDropdown(false)
                        setShowLocationDropdown(false)
                        setShowWorkAuthDropdown(false)
                        setShowWorkAuthCountryDropdown(false)
                      }}
                  isOpen={showLanguageDropdown}
                  hasSelection={filters.languages.length > 0}
                  placeholder={t('select_languages') || t('any')}
                  selectionText={`${filters.languages.length} selected`}
                />
                
                <AnimatedDropdown isOpen={showLanguageDropdown}>
                            {languages.map(lang => (
                    <CheckboxItem
                                key={lang}
                                  checked={filters.languages.includes(lang)}
                                  onChange={() => toggleLanguage(lang)}
                      label={languageDisplay[lang].name}
                      flag={languageDisplay[lang].flag}
                    />
                  ))}
                </AnimatedDropdown>
                
                <SelectedTags
                  items={filters.languages}
                  onRemove={(lang) => toggleLanguage(lang as Language)}
                  renderLabel={(lang) => (
                    <>
                      <FlagIcon code={languageDisplay[lang as Language].flag} />
                      {languageDisplay[lang as Language].name}
                    </>
                  )}
                  accentColor="slate"
                />
                  </div>
            </FilterSection>

                {/* Location */}
            <FilterSection label={t('location')}>
              <div className="relative">
                <FilterDropdownButton
                      onClick={() => {
                        setShowLocationDropdown(!showLocationDropdown)
                        setShowWorkTypeDropdown(false)
                        setShowLanguageDropdown(false)
                        setShowWorkAuthDropdown(false)
                        setShowWorkAuthCountryDropdown(false)
                      }}
                  isOpen={showLocationDropdown}
                  hasSelection={filters.locations.length > 0}
                  placeholder={t('any')}
                  selectionText={`${filters.locations.length} selected`}
                />
                
                <AnimatedDropdown isOpen={showLocationDropdown}>
                            {locationFilters.map(location => (
                    <CheckboxItem
                                key={location.id}
                                  checked={filters.locations.includes(location.id)}
                                  onChange={() => toggleLocation(location.id)}
                      label={location.name}
                      flag={location.id !== 'anywhere' ? location.id : undefined}
                    />
                  ))}
                </AnimatedDropdown>
                
                <SelectedTags
                  items={filters.locations}
                  onRemove={(location) => toggleLocation(location)}
                  renderLabel={(location) => {
                          const loc = locationFilters.find(l => l.id === location)
                    return loc ? <>{loc.id !== 'anywhere' && <FlagIcon code={loc.id} size="xs" />} {loc.name}</> : location
                  }}
                  accentColor="slate"
                />
                      </div>
            </FilterSection>

                {/* Work Authorization Filter */}
            <FilterSection label={t('work_authorization' as any) || 'Work Authorization'}>
              <div className="relative">
                <FilterDropdownButton
                      onClick={() => {
                        setShowWorkAuthDropdown(!showWorkAuthDropdown)
                        setShowWorkTypeDropdown(false)
                        setShowLanguageDropdown(false)
                        setShowLocationDropdown(false)
                        setShowWorkAuthCountryDropdown(false)
                      }}
                  isOpen={showWorkAuthDropdown}
                  hasSelection={filters.work_authorization_statuses.length > 0}
                  placeholder={t('any')}
                  selectionText={
                    filters.work_authorization_statuses.length === 1
                            ? t(WORK_AUTH_OPTIONS.find(o => o.status === filters.work_authorization_statuses[0])?.labelKey as any)
                      : `${filters.work_authorization_statuses.length} selected`
                  }
                />
                
                <AnimatedDropdown isOpen={showWorkAuthDropdown}>
                            {WORK_AUTH_OPTIONS.map((option) => {
                              const Icon = option.icon
                              return (
                      <CheckboxItem
                                  key={option.status}
                        checked={filters.work_authorization_statuses.includes(option.status)}
                                    onChange={() => toggleWorkAuthStatus(option.status)}
                        label={t(option.labelKey as any)}
                        icon={<Icon className="w-4 h-4 flex-shrink-0 text-slate-500" />}
                                  />
                              )
                            })}
                          
                          {/* Country Selection inline */}
                          {needsCountrySelection && (
                    <div className="border-t border-slate-100 p-3 bg-slate-50 -mx-2 -mb-2 mt-2">
                              <label className="block text-xs font-medium mb-2 text-slate-500">
                                {t('select_authorization_countries' as any) || 'Filter by country (optional):'}
                              </label>
                              
                              {/* Selected countries chips */}
                              {filters.work_authorization_countries.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {filters.work_authorization_countries.map(countryCode => {
                                    const country = EUROPEAN_COUNTRIES.find(c => c.code === countryCode)
                                    if (!country) return null
                                    return (
                                      <span 
                                        key={countryCode}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-white rounded text-xs font-medium"
                                      >
                                        <FlagIcon code={country.code} size="xs" />
                                        <span>{country.name}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            removeWorkAuthCountry(countryCode)
                                          }}
                                          className="ml-0.5 text-white/70 hover:text-white"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    )
                                  })}
                                </div>
                              )}

                              {/* Country search input */}
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                  type="text"
                                  value={workAuthCountrySearchQuery}
                                  onChange={(e) => setWorkAuthCountrySearchQuery(e.target.value)}
                                  placeholder={t('type_to_search_country' as any) || 'Search countries...'}
                                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              
                              {/* Country list */}
                              <div className="mt-2 max-h-32 overflow-y-auto">
                                {filteredWorkAuthCountries.slice(0, 8).map((country) => (
                                  <button
                                    key={country.code}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleWorkAuthCountry(country.code)
                                    }}
                                    className="w-full px-2 py-1.5 flex items-center gap-2 hover:bg-white rounded text-sm transition-colors"
                                  >
                                    <FlagIcon code={country.code} size="sm" />
                                    <span className="text-slate-600">{country.name}</span>
                                  </button>
                                ))}
                                {filteredWorkAuthCountries.length > 8 && (
                                  <div className="px-2 py-1.5 text-xs text-slate-400">
                                    +{filteredWorkAuthCountries.length - 8} more...
                                  </div>
                                )}
                                {filteredWorkAuthCountries.length === 0 && (
                                  <div className="px-2 py-1.5 text-xs text-slate-400 text-center">
                                    {t('no_countries_found' as any) || 'No countries found'}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                </AnimatedDropdown>
                        </div>
            </FilterSection>

              </div>
          </div>

          {/* Worker Listings - Main Content Area */}
          <div className="flex-1 min-w-0 bg-slate-50 md:bg-white">
            {/* Mobile Header */}
            <div className="lg:hidden px-4 py-5 bg-white border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{t('browse_workers' as any) || 'Browse Workers'}</h1>
                  <p className="text-base text-slate-500 mt-1">
                    {workers.length} {workers.length === 1 ? (t('worker') || 'worker') : (t('workers') || 'workers')} {t('available' as any) || 'available'}
                  </p>
                </div>
                <button
                  onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                  className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl border border-slate-200 text-base font-medium text-slate-700 hover:border-slate-300 transition-all shadow-sm"
                >
                  <Filter className="w-5 h-5" />
                  <span>{t('filter')}</span>
                  {hasActiveFilters && (
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                  )}
                </button>
              </div>
            </div>

            {workers.length === 0 ? (
              <div className="mx-4 lg:mx-0 bg-white rounded-lg shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                </div>
                <p className="text-sm sm:text-base font-semibold text-slate-800 mb-1">{t('no_workers_found_employer')}</p>
                <p className="text-xs sm:text-sm text-slate-500 mb-4">{t('adjust_filters_find_workers')}</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-blue-500 text-white text-xs sm:text-sm rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    {t('clear_filters')}
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white lg:overflow-hidden">
                {/* Table Header - Hidden on mobile */}
                <div className={`hidden md:grid gap-3 px-4 py-7 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wide ${isPanelOpen ? 'grid-cols-6' : 'grid-cols-12'}`}>
                  <div className={isPanelOpen ? 'col-span-2' : 'col-span-3'}>
                    {t('worker') || 'Name'}
                  </div>
                  <div className={isPanelOpen ? 'col-span-1' : 'col-span-2'}>
                    {t('languages')}
                  </div>
                  {!isPanelOpen && (
                    <div className="col-span-2">
                      {t('work_authorization' as any) || 'Work Permit'}
                    </div>
                  )}
                  <div className={isPanelOpen ? 'col-span-2' : 'col-span-2'}>
                    {t('location') || 'Location'}
                  </div>
                  {!isPanelOpen && (
                    <div className="col-span-2">
                      {t('sectors') || 'Sectors'}
                    </div>
                  )}
                  <div className={`text-right ${isPanelOpen ? 'col-span-1' : 'col-span-1'}`}>
                    {t('send_offer' as any) || 'Send Offer'}
                  </div>
                </div>

                {/* Worker Cards - Mobile: Card style, Desktop: Table rows */}
                <div className="px-4 md:px-0 pb-4 md:pb-0 md:divide-y md:divide-slate-100">
                  {workers.map((worker, index) => (
                    <div key={worker.id} data-testid={`worker-card-${worker.id}`}>
                      {/* Mobile Card Design */}
                      <div className="md:hidden mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 30}ms` }}>
                        <div
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                          onClick={() => handleSelectWorker(worker)}
                        >
                          {/* Card Header with Avatar */}
                          <div className="p-4 pb-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                {worker.profile_image_url ? (
                                  <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-slate-100 shadow-md">
                                    <img
                                      src={worker.profile_image_url}
                                      alt={worker.full_name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-blue-500/20">
                                    {worker.full_name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <span
                                  className="block font-bold text-slate-900 text-base leading-tight mb-1 hover:text-blue-600 transition-colors"
                                >
                                  {worker.full_name}
                                </span>
                                
                                {/* Primary Info Tags */}
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  {worker.work_types && worker.work_types.length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                                      <Briefcase className="w-3 h-3" />
                                      {t(worker.work_types[0])}
                                    </span>
                                  )}
                                  
                                  {worker.preferred_locations && worker.preferred_locations.length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                                      {worker.preferred_locations[0] === 'anywhere' ? (
                                        <>
                                          <Globe className="w-3 h-3" />
                                          <span className="truncate max-w-[120px]">
                                            {t('anywhere_in_europe' as any) || 'Anywhere'}
                                          </span>
                                        </>
                                      ) : worker.preferred_locations[0]?.startsWith('anywhere:') ? (
                                        <>
                                          <Globe className="w-3 h-3" />
                                          <span className="truncate max-w-[120px] flex items-center gap-1">
                                            {(() => {
                                              const cc = worker.preferred_locations[0].replace('anywhere:', '')
                                              const country = locationFilters.find(l => l.id === cc)
                                              return country ? <><FlagIcon code={country.id} size="xs" /> {country.name}</> : <>{worker.preferred_locations[0]}</>
                                            })()}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <MapPin className="w-3 h-3" />
                                          <span className="truncate max-w-[120px]">
                                            {locationFilters.find(l => l.id === worker.preferred_locations?.[0])?.name || worker.preferred_locations[0]}
                                          </span>
                                        </>
                                      )}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Languages Row */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {worker.languages.slice(0, 4).map((lang) => (
                                    <span 
                                      key={lang}
                                      title={languageDisplay[lang]?.name}
                                    >
                                      {languageDisplay[lang]?.flag && <FlagIcon code={languageDisplay[lang].flag} size="md" />}
                                    </span>
                                  ))}
                                  {worker.languages.length > 4 && (
                                    <span className="text-xs text-slate-500 font-medium">+{worker.languages.length - 4}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Quick Info Pills */}
                          <div className="px-4 pb-3">
                            <div className="flex flex-wrap gap-1.5">
                              {worker.work_authorization && worker.work_authorization.status && (
                                <WorkAuthBadge 
                                  status={worker.work_authorization.status} 
                                  countries={worker.work_authorization.countries} 
                                  t={t} 
                                />
                              )}
                              
                              {worker.available_immediately && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200">
                                  <Calendar className="w-3 h-3" />
                                  {t('available_immediately')}
                                </span>
                              )}
                              
                              {worker.certifications && worker.certifications.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium border border-amber-200">
                                  <Award className="w-3 h-3" />
                                  {worker.certifications.length} {worker.certifications.length === 1 ? 'cert' : 'certs'}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="px-4 pb-4 flex gap-2">
                            <Link
                              href={`/worker/view-profile?id=${worker.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm rounded-xl font-semibold hover:bg-slate-200 transition-all text-center"
                            >
                              {t('view_profile')}
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleContact(worker) }}
                              disabled={contacting === worker.id || contactedWorkers.has(worker.id)}
                              data-testid={`send-offer-${worker.id}`}
                              className={`flex-1 px-4 py-2.5 text-sm rounded-xl font-semibold transition-all text-center ${
                                contactedWorkers.has(worker.id)
                                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                                  : contacting === worker.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md active:scale-[0.98]'
                              }`}
                            >
                              {contacting === worker.id ? (
                                <span className="flex items-center justify-center gap-2">
                                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  {t('loading')}
                                </span>
                              ) : contactedWorkers.has(worker.id) ? (
                                <span className="flex items-center justify-center gap-1.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {t('contacted' as any) || 'Contacted'}
                                </span>
                              ) : (
                                <span className="flex items-center justify-center gap-1.5">
                                  <Send className="w-3.5 h-3.5" />
                                  {t('contact')}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Desktop Table Row */}
                      <div
                        className="hidden md:block p-3 sm:p-4 hover:bg-slate-50 transition-colors group cursor-pointer"
                        onClick={() => handleSelectWorker(worker)}
                      >
                        <div className={`flex items-start gap-3 md:grid md:gap-3 md:items-center ${isPanelOpen ? 'md:grid-cols-6' : 'md:grid-cols-12'}`}>
                          {/* Avatar + Name */}
                          <div className={`flex items-center gap-3 flex-1 min-w-0 ${isPanelOpen ? 'md:col-span-2' : 'md:col-span-3'}`}>
                            <div className="flex-shrink-0">
                              {worker.profile_image_url ? (
                                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-slate-100 group-hover:ring-blue-200 transition-all">
                                  <img
                                    src={worker.profile_image_url}
                                    alt={worker.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-slate-100 group-hover:ring-blue-200 transition-all">
                                  {worker.full_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span
                                className="block text-sm font-semibold text-slate-900 truncate hover:text-blue-600 transition-colors"
                              >
                                {worker.full_name}
                              </span>
                            </div>
                          </div>

                          {/* Languages (desktop only inline) */}
                          <div className={`hidden md:flex items-center min-w-0 ${isPanelOpen ? 'md:col-span-1' : 'md:col-span-2'}`}>
                            <div className="flex items-center gap-1">
                              {worker.languages.slice(0, 4).map((lang) => (
                                <span 
                                  key={lang} 
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                                  title={languageDisplay[lang]?.name}
                                >
                                  {languageDisplay[lang]?.flag && <FlagIcon code={languageDisplay[lang].flag} size="sm" />}
                                </span>
                              ))}
                              {worker.languages.length > 4 && (
                                <span className="text-xs text-slate-500">+{worker.languages.length - 4}</span>
                              )}
                            </div>
                          </div>

                          {/* Work Authorization (desktop only, hidden when panel open) */}
                          {!isPanelOpen && (
                            <div className="hidden md:flex md:col-span-2 items-center min-w-0">
                              {worker.work_authorization && worker.work_authorization.status ? (
                                <WorkAuthBadge
                                  status={worker.work_authorization.status}
                                  countries={worker.work_authorization.countries}
                                  t={t}
                                />
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </div>
                          )}

                          {/* Location (desktop only inline) */}
                          <div className={`hidden md:flex items-center min-w-0 ${isPanelOpen ? 'md:col-span-2' : 'md:col-span-2'}`}>
                            <div className="text-sm text-slate-600 truncate">
                              {worker.preferred_locations && worker.preferred_locations.length > 0 ? (
                                <>
                                  {worker.preferred_locations[0] === 'anywhere' ? (
                                    <span className="flex items-center gap-1">
                                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                                      {t('anywhere_in_europe' as any) || 'Anywhere'}
                                    </span>
                                  ) : worker.preferred_locations[0]?.startsWith('anywhere:') ? (
                                    <span className="flex items-center gap-1">
                                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                                      {(() => {
                                        const cc = worker.preferred_locations[0].replace('anywhere:', '')
                                        const country = locationFilters.find(l => l.id === cc)
                                        return country ? <><FlagIcon code={country.id} size="xs" /> {country.name}</> : <>{worker.preferred_locations[0]}</>
                                      })()}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                      {locationFilters.find(l => l.id === worker.preferred_locations?.[0])?.name || worker.preferred_locations[0]}
                                    </span>
                                  )}
                                  {worker.preferred_locations.length > 1 && (
                                    <span className="text-xs text-slate-400 ml-1">+{worker.preferred_locations.length - 1}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </div>

                          {/* Work Types / Sectors (desktop only, hidden when panel open) */}
                          {!isPanelOpen && (
                            <div className="hidden md:flex md:col-span-2 items-center min-w-0">
                              <div className="flex flex-wrap gap-1">
                                {worker.work_types.slice(0, 1).map(type => {
                                  const getCompanyIcon = (workType: string) => {
                                    const icons: Record<string, React.ElementType> = {
                                      construction: HardHat,
                                      manufacturing: Factory,
                                      logistics_warehousing: Package,
                                      agriculture: Wheat,
                                      hospitality_tourism: Hotel,
                                      cleaning_maintenance: Sparkles,
                                      care_household: Heart,
                                      transport_delivery: Truck,
                                      general_temporary: Briefcase,
                                      other: Wrench,
                                    }
                                    const Icon = icons[workType] || Briefcase
                                    return <Icon className="w-3.5 h-3.5" />
                                  }
                                  return (
                                    <span
                                      key={type}
                                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                                    >
                                      {getCompanyIcon(type)}
                                      <span>{t(type)}</span>
                                    </span>
                                  )
                                })}
                                {worker.work_types.length > 1 && (
                                  <span className="inline-flex items-center px-1.5 py-1 text-xs text-slate-500">
                                    +{worker.work_types.length - 1}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Send Offer Button - Desktop only */}
                          <div className="flex-shrink-0 md:col-span-1 flex items-center justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleContact(worker) }}
                              disabled={contacting === worker.id || contactedWorkers.has(worker.id)}
                              data-testid={`send-offer-${worker.id}`}
                              title={contactedWorkers.has(worker.id) ? (t('contacted' as any) || 'Contacted') : t('contact')}
                              className={`inline-flex items-center justify-center p-2 text-xs font-semibold rounded-lg transition-all ${
                                contactedWorkers.has(worker.id)
                                  ? 'bg-transparent text-slate-400 cursor-not-allowed'
                                  : contacting === worker.id
                                    ? 'text-blue-600 bg-blue-50'
                                    : 'bg-transparent text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              {contacting === worker.id ? (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : contactedWorkers.has(worker.id) ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Backdrop Overlay */}
          {isPanelOpen && displayedWorker && (
            <div
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
              onClick={handleCloseWorkerDetail}
            />
          )}

          {/* Worker Detail Sidebar - responsive */}
          <div className={`bg-white overflow-hidden transition-all duration-300 ${
            isPanelOpen && displayedWorker
              ? 'fixed inset-y-0 right-0 w-full z-50 shadow-2xl lg:relative lg:z-auto lg:w-[45%] xl:w-[40%] lg:shadow-none lg:border-l lg:border-slate-200'
              : 'w-0 hidden lg:block lg:border-l lg:border-slate-200'
          }`}>
            {displayedWorker && (
              <WorkerDetailPanel
                worker={displayedWorker}
                onClose={handleCloseWorkerDetail}
                onContact={handleContact}
                contacting={contacting === displayedWorker.id}
                contacted={contactedWorkers.has(displayedWorker.id)}
                t={t}
                language={language}
                languageDisplay={languageDisplay}
                locationFilters={locationFilters}
              />
            )}
          </div>
        </div>

      {/* Mobile Filters Panel - Using FilterPanel Component */}
      <FilterPanel
        isOpen={showFiltersMobile}
        onClose={() => setShowFiltersMobile(false)}
        title={t('filter')}
        accentColor="blue"
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
        onApply={() => {}}
        applyButtonText={t('apply_filters' as any) || 'Apply Filters'}
        position="left"
      >
        {/* Toggle Advanced */}
        <div className="flex justify-end -mt-2 mb-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-sm text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
              >
                {showAdvancedFilters ? t('simple') : t('advanced')}
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </button>
          </div>

            {/* Sectors */}
        <FilterSection label={t('sectors')}>
              <div className="relative">
            <FilterDropdownButton
                  onClick={() => {
                    setShowWorkTypeDropdown(!showWorkTypeDropdown)
                    setShowLanguageDropdown(false)
                    setShowLocationDropdown(false)
                    setShowWorkAuthCountryDropdown(false)
                  }}
              isOpen={showWorkTypeDropdown}
              hasSelection={filters.work_types.length > 0}
              placeholder={t('select_types') || t('any')}
              selectionText={`${filters.work_types.length} selected`}
            />
            
            <AnimatedDropdown isOpen={showWorkTypeDropdown}>
                      {workTypes.map(type => (
                <CheckboxItem
                          key={type}
                            checked={filters.work_types.includes(type)}
                            onChange={() => toggleWorkType(type)}
                  label={t(type)}
                />
              ))}
            </AnimatedDropdown>
            
            <SelectedTags
              items={filters.work_types}
              onRemove={(type) => toggleWorkType(type as WorkType)}
              renderLabel={(type) => t(type as WorkType)}
              accentColor="blue"
            />
                  </div>
        </FilterSection>

            {/* Languages */}
        <FilterSection label={t('languages')}>
              <div className="relative">
            <FilterDropdownButton
                  onClick={() => {
                    setShowLanguageDropdown(!showLanguageDropdown)
                    setShowWorkTypeDropdown(false)
                    setShowLocationDropdown(false)
                    setShowWorkAuthCountryDropdown(false)
                  }}
              isOpen={showLanguageDropdown}
              hasSelection={filters.languages.length > 0}
              placeholder={t('select_languages') || t('any')}
              selectionText={`${filters.languages.length} selected`}
            />
            
            <AnimatedDropdown isOpen={showLanguageDropdown}>
                      {languages.map(lang => (
                <CheckboxItem
                          key={lang}
                            checked={filters.languages.includes(lang)}
                            onChange={() => toggleLanguage(lang)}
                  label={languageDisplay[lang].name}
                  flag={languageDisplay[lang].flag}
                />
              ))}
            </AnimatedDropdown>
            
            <SelectedTags
              items={filters.languages}
              onRemove={(lang) => toggleLanguage(lang as Language)}
              renderLabel={(lang) => (
                <>
                  <FlagIcon code={languageDisplay[lang as Language].flag} />
                  {languageDisplay[lang as Language].name}
                </>
              )}
              accentColor="blue"
            />
              </div>
        </FilterSection>

            {/* Location */}
        <FilterSection label={t('location')}>
              <div className="relative">
            <FilterDropdownButton
                  onClick={() => {
                    setShowLocationDropdown(!showLocationDropdown)
                    setShowWorkTypeDropdown(false)
                    setShowLanguageDropdown(false)
                    setShowWorkAuthCountryDropdown(false)
                  }}
              isOpen={showLocationDropdown}
              hasSelection={filters.locations.length > 0}
              placeholder={t('any')}
              selectionText={`${filters.locations.length} selected`}
            />
            
            <AnimatedDropdown isOpen={showLocationDropdown}>
                      {locationFilters.map(location => (
                <CheckboxItem
                          key={location.id}
                            checked={filters.locations.includes(location.id)}
                            onChange={() => toggleLocation(location.id)}
                  label={location.name}
                  flag={location.id !== 'anywhere' ? location.id : undefined}
                />
              ))}
            </AnimatedDropdown>
            
            <SelectedTags
              items={filters.locations}
              onRemove={(location) => toggleLocation(location)}
              renderLabel={(location) => {
                      const loc = locationFilters.find(l => l.id === location)
                return loc ? <>{loc.id !== 'anywhere' && <FlagIcon code={loc.id} size="xs" />} {loc.name}</> : location
              }}
              accentColor="blue"
            />
                  </div>
        </FilterSection>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
          <>
            <div className="h-px bg-slate-200" />

              {/* Work Authorization Filter */}
            <FilterSection label={t('work_authorization' as any) || 'Work Permit'}>
                <div className="relative">
                <FilterDropdownButton
                    onClick={() => {
                      setShowWorkAuthDropdown(!showWorkAuthDropdown)
                      setShowWorkTypeDropdown(false)
                      setShowLanguageDropdown(false)
                      setShowLocationDropdown(false)
                      setShowWorkAuthCountryDropdown(false)
                    }}
                  isOpen={showWorkAuthDropdown}
                  hasSelection={filters.work_authorization_statuses.length > 0}
                  placeholder={t('any')}
                  selectionText={
                    filters.work_authorization_statuses.length === 1
                          ? t(WORK_AUTH_OPTIONS.find(o => o.status === filters.work_authorization_statuses[0])?.labelKey as any)
                      : `${filters.work_authorization_statuses.length} selected`
                  }
                />
                
                <AnimatedDropdown isOpen={showWorkAuthDropdown}>
                        {WORK_AUTH_OPTIONS.map((option) => {
                          const Icon = option.icon
                          return (
                      <CheckboxItem
                              key={option.status}
                        checked={filters.work_authorization_statuses.includes(option.status)}
                                onChange={() => toggleWorkAuthStatus(option.status)}
                        label={t(option.labelKey as any)}
                        icon={<Icon className={`w-4 h-4 flex-shrink-0 ${
                                option.color === 'emerald' ? 'text-emerald-500' :
                                option.color === 'blue' ? 'text-blue-500' :
                                option.color === 'amber' ? 'text-amber-500' :
                                'text-slate-400'
                        }`} />}
                      />
                          )
                        })}
                      
                      {/* Country Selection inline */}
                      {needsCountrySelection && (
                    <div className="border-t border-slate-100 p-3 bg-slate-50 -mx-2 -mb-2 mt-2">
                          <label className="block text-xs font-medium mb-2 text-slate-600">
                            {t('select_authorization_countries' as any) || 'Filter by country (optional):'}
                          </label>
                          
                          {/* Selected countries chips */}
                          {filters.work_authorization_countries.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {filters.work_authorization_countries.map(countryCode => {
                                const country = EUROPEAN_COUNTRIES.find(c => c.code === countryCode)
                                if (!country) return null
                                return (
                                  <span 
                                    key={countryCode}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-xs font-medium"
                                  >
                                    <FlagIcon code={country.code} size="xs" />
                                    <span>{country.name}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        removeWorkAuthCountry(countryCode)
                                      }}
                                      className="ml-0.5 text-slate-400 hover:text-slate-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                )
                              })}
                            </div>
                          )}

                          {/* Country search input */}
                          <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={workAuthCountrySearchQuery}
                              onChange={(e) => setWorkAuthCountrySearchQuery(e.target.value)}
                              placeholder={t('type_to_search_country' as any) || 'Search countries...'}
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          
                          {/* Country list */}
                          <div className="mt-2 max-h-32 overflow-y-auto">
                            {filteredWorkAuthCountries.slice(0, 8).map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleWorkAuthCountry(country.code)
                                }}
                                className="w-full px-2 py-1.5 flex items-center gap-2 hover:bg-white rounded-lg text-sm transition-colors"
                              >
                                <FlagIcon code={country.code} size="sm" />
                                <span className="text-slate-700">{country.name}</span>
                              </button>
                            ))}
                            {filteredWorkAuthCountries.length > 8 && (
                              <div className="px-2 py-1.5 text-xs text-slate-400">
                                +{filteredWorkAuthCountries.length - 8} more...
                              </div>
                            )}
                            {filteredWorkAuthCountries.length === 0 && (
                              <div className="px-2 py-1.5 text-xs text-slate-400 text-center">
                                {t('no_countries_found' as any) || 'No countries found'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                </AnimatedDropdown>
                    </div>
            </FilterSection>

              {/* Available Now Toggle */}
          </>
        )}
      </FilterPanel>

      {/* Contact Worker Modal */}
      {showContactModal && selectedWorker && (
        <ContactWorkerModal
          worker={selectedWorker}
          jobs={jobs}
          workerApplications={selectedWorkerApplications}
          onClose={() => {
            setShowContactModal(false)
            setSelectedWorker(null)
            setSelectedWorkerApplications([])
          }}
          onSendOffer={handleSendJobOffer}
          onCreateNewJob={handleCreateNewJobForWorker}
          onMessageDirectly={handleMessageDirectly}
          sending={contacting === selectedWorker.id}
          sentJobIds={sentOffersByWorker.get(selectedWorker.id)}
        />
      )}

      {/* Create Job Modal */}
      {showCreateJobModal && (
        <CreateJobModal
          formData={formData}
          updateField={updateFormField}
          onSubmit={handleCreateJobSubmit}
          onCancel={handleCancelJobCreation}
          creating={creatingJob}
          isOffer={true}
        />
      )}
    </div>
  )
}

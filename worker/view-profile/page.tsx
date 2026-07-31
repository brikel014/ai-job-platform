'use client'

/**
 * Worker Profile View Page
 * 
 * Displays a worker's public profile with a clean, professional design
 * that matches the employer profile layout. Key information (work authorization,
 * languages, nationality, sector) is prominently featured at the top.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { logError } from '@/lib/logger'
import {
  getWorkerProfile,
  getEmployerProfile,
  getJobPostings,
  getWorkerApplicationsToEmployer,
  createJobPosting,
  getWorkerExperience,
  createOrGetConversationFromApplication,
  updateApplicationStatus
} from '@/lib/db'
import { sendDirectOffer } from '@/lib/db/applications'
import type { WorkerProfile, JobPosting, JobType, WorkerExperience } from '@/lib/types'
import type { WorkerApplicationWithJob } from '@/lib/db/applications'
import dynamic from 'next/dynamic'
const ContactWorkerFromProfileModal = dynamic(() => import('@/components/employer/ContactWorkerFromProfileModal').then(m => ({ default: m.ContactWorkerFromProfileModal })), { ssr: false })
const CreateJobModal = dynamic(() => import('@/components/employer/CreateJobModal').then(m => ({ default: m.CreateJobModal })), { ssr: false })
import type { JobFormData } from '@/hooks/useEmployerJobs'
import { Toast, type ToastType } from '@/components/ui/Toast'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import { EmployerSidebar } from '@/components/employer/EmployerSidebar'
import { EmployerDataProvider } from '@/lib/contexts/EmployerDataContext'
import { useNotifications } from '@/components/navbar/hooks/useNotifications'
import { NotificationDropdown } from '@/components/navbar/NotificationDropdown'
import { 
  MapPin, 
  Calendar, 
  Globe2, 
  Award, 
  Briefcase,
  User,
  Mail,
  Phone,
  MessageCircle,
  Shield,
  Home,
  HelpCircle,
  Edit3,
  Languages,
  FileCheck,
  Send,
  Inbox,
  FileText,
  ExternalLink,
  LogOut,
  Bell,
  Building2,
  Menu,
  Globe
} from 'lucide-react'
import { FlagIcon } from '@/components/ui/FlagIcon'
import type { WorkAuthorizationStatus, EmployerProfile } from '@/lib/types'
import type { TranslationKey } from '@/lib/i18n'
import { calculateAge } from '@/lib/validation/shared'

// Employer Layout Wrapper - defined outside WorkerProfileViewContent to prevent remounting on state changes
interface EmployerLayoutWrapperProps {
  children: React.ReactNode
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  isNotificationDropdownOpen: boolean
  setIsNotificationDropdownOpen: (open: boolean) => void
  employerProfileData: EmployerProfile | null
  notifications: any[]
  notificationsLoading: boolean
  notificationCount: number
  markNotificationAsRead: (notificationId: string) => Promise<void>
  markAllNotificationsAsRead: () => Promise<void>
  t: (key: any) => string
}

function EmployerLayoutWrapper({
  children,
  mobileMenuOpen,
  setMobileMenuOpen,
  isNotificationDropdownOpen,
  setIsNotificationDropdownOpen,
  employerProfileData,
  notifications,
  notificationsLoading,
  notificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  t
}: EmployerLayoutWrapperProps) {
  return (
    <EmployerDataProvider>
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar - Full Width */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[71px] bg-white border-b border-slate-200 flex items-center justify-between px-5 lg:px-8">
        {/* Left: Mobile Menu + Logo */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Menu className="w-6 h-6" strokeWidth={1.5} />
          </button>
          
          {/* Logo */}
          <Link href="/employer" className="flex items-center">
            <Image
              src="/icon.jpg"
              alt="Stellio"
              width={140}
              height={42}
              priority
              className="h-10 w-auto"
            />
          </Link>
        </div>

        {/* Right: Notifications + Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
              className={`relative p-3 rounded-xl transition-colors ${
                notificationCount > 0 
                  ? 'bg-slate-100 text-slate-700' 
                  : 'text-slate-500 hover:bg-slate-100'
              } ${isNotificationDropdownOpen ? 'bg-slate-100' : ''}`}
              aria-expanded={isNotificationDropdownOpen}
              aria-haspopup="true"
            >
              <Bell className="w-6 h-6" strokeWidth={1.5} />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-slate-800 text-white rounded-full px-1">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
            
            <NotificationDropdown
              notifications={notifications}
              loading={notificationsLoading}
              unreadCount={notificationCount}
              t={t}
              isOpen={isNotificationDropdownOpen}
              onClose={() => setIsNotificationDropdownOpen(false)}
              onMarkAsRead={markNotificationAsRead}
              onMarkAllAsRead={markAllNotificationsAsRead}
            />
          </div>

          {/* Profile Picture */}
          <Link
            href="/employer/view-profile"
            className="flex items-center p-1"
          >
            {employerProfileData?.profile_image_url ? (
              <img
                src={employerProfileData.profile_image_url}
                alt={employerProfileData.company_name || ''}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 hover:ring-slate-200 transition-all"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center ring-2 ring-slate-100 hover:ring-slate-200 transition-all">
                <Building2 className="w-6 h-6 text-slate-500" strokeWidth={1.5} />
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Layout below navbar */}
      <div className="flex pt-[71px]">
        {/* Sidebar */}
        <EmployerSidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
        
        {/* Main Content Area */}
        <main className="flex-1 min-h-[calc(100vh-71px)]">
          {/* Page Content */}
          <div className="pb-6">
            {children}
          </div>
        </main>
      </div>
    </div>
    </EmployerDataProvider>
  )
}

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

// Known country codes — used directly as ISO 3166-1 alpha-2 codes for FlagIcon
const KNOWN_COUNTRY_CODES = new Set([
  'de','at','ch','fr','be','nl','lu','li','mc',
  'gb','ie','dk','se','no','fi','is',
  'it','es','pt','gr','mt','cy','ad','sm','va',
  'pl','cz','sk','hu','ro','bg','ua','md','by',
  'ee','lv','lt',
  'si','hr','ba','rs','me','mk','al','xk',
])

const COUNTRY_NAMES: Record<string, string> = {
  de: 'Germany', at: 'Austria', ch: 'Switzerland', fr: 'France', be: 'Belgium', nl: 'Netherlands', 
  lu: 'Luxembourg', li: 'Liechtenstein', mc: 'Monaco',
  gb: 'United Kingdom', ie: 'Ireland', dk: 'Denmark', se: 'Sweden', no: 'Norway', fi: 'Finland', is: 'Iceland',
  it: 'Italy', es: 'Spain', pt: 'Portugal', gr: 'Greece', mt: 'Malta', cy: 'Cyprus', 
  ad: 'Andorra', sm: 'San Marino', va: 'Vatican City',
  pl: 'Poland', cz: 'Czech Republic', sk: 'Slovakia', hu: 'Hungary', ro: 'Romania', bg: 'Bulgaria', 
  ua: 'Ukraine', md: 'Moldova', by: 'Belarus',
  ee: 'Estonia', lv: 'Latvia', lt: 'Lithuania',
  si: 'Slovenia', hr: 'Croatia', ba: 'Bosnia and Herzegovina', rs: 'Serbia', me: 'Montenegro', 
  mk: 'North Macedonia', al: 'Albania', xk: 'Kosovo',
}

// Language names mapping
const LANGUAGE_NAMES: Record<string, string> = {
  de: 'German', en: 'English', fr: 'French', it: 'Italian', es: 'Spanish',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', cs: 'Czech', hu: 'Hungarian',
  ro: 'Romanian', bg: 'Bulgarian', hr: 'Croatian', sk: 'Slovak', sl: 'Slovenian',
  uk: 'Ukrainian', ru: 'Russian', tr: 'Turkish', ar: 'Arabic', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', hi: 'Hindi', vi: 'Vietnamese', th: 'Thai',
  sr: 'Serbian', bs: 'Bosnian', mk: 'Macedonian', el: 'Greek', sq: 'Albanian',
}

// Language code → country code for CSS flag icon
const LANGUAGE_COUNTRY_CODES: Record<string, string> = {
  de: 'de', en: 'gb', fr: 'fr', it: 'it', es: 'es',
  pt: 'pt', nl: 'nl', pl: 'pl', cs: 'cz', hu: 'hu',
  ro: 'ro', bg: 'bg', hr: 'hr', sk: 'sk', sl: 'si',
  uk: 'ua', ru: 'ru', tr: 'tr', ar: 'sa', zh: 'cn',
  ja: 'jp', ko: 'kr', hi: 'in', vi: 'vn', th: 'th',
  sr: 'rs', bs: 'ba', mk: 'mk', el: 'gr', sq: 'al',
}

const getLocationDisplay = (locId: string): { countryCode: string | null; text: string } => {
  if (locId === 'anywhere') {
    return { countryCode: null, text: 'Anywhere' }
  }
  
  if (locId.startsWith('anywhere:')) {
    const country = locId.replace('anywhere:', '')
    const name = COUNTRY_NAMES[country] || country.toUpperCase()
    return { countryCode: country, text: `Anywhere in ${name}` }
  }
  
  if (locId.includes(':')) {
    const [city, country] = locId.split(':')
    return { countryCode: country || null, text: city }
  }
  
  return { countryCode: null, text: locId }
}

// Generate initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Work authorization configuration for badges - monochrome style
 */
const getWorkAuthConfig = (status: WorkAuthorizationStatus, t: (key: any) => string) => {
  const config: Record<WorkAuthorizationStatus, { 
    icon: React.ElementType; 
    label: string;
  }> = {
    eu_citizen: { 
      icon: Shield, 
      label: t('work_auth_eu_citizen_short')
    },
    permanent_resident: { 
      icon: Home, 
      label: t('work_auth_resident_short')
    },
    work_permit_holder: { 
      icon: FileCheck, 
      label: t('work_auth_permit_short')
    },
    needs_sponsorship: { 
      icon: HelpCircle, 
      label: t('work_auth_sponsorship_short')
    }
  }
  return config[status]
}

function WorkerProfileViewContent() {
  const { user, role, loading: authLoading, signOut } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const workerId = searchParams.get('id')
  const wasUpdated = searchParams.get('updated') === 'true'
  const [profile, setProfile] = useState<WorkerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFullBio, setShowFullBio] = useState(false)
  const [translations, setTranslations] = useState<Record<string, { text: string; loading: boolean; error: boolean; visible: boolean } | null>>({})
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(wasUpdated)
  const [experienceEntries, setExperienceEntries] = useState<WorkerExperience[]>([])
  
  // Employer-specific state for contacting workers
  const [isEmployer, setIsEmployer] = useState(false)
  const [employerJobs, setEmployerJobs] = useState<JobPosting[]>([])
  const [workerApplications, setWorkerApplications] = useState<WorkerApplicationWithJob[]>([])
  const [showContactModal, setShowContactModal] = useState(false)
  const [showCreateJobModal, setShowCreateJobModal] = useState(false)
  const [sendingOffer, setSendingOffer] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [employerId, setEmployerId] = useState<string | null>(null)
  const [sentJobIds, setSentJobIds] = useState<Set<string>>(new Set())
  const [creatingJob, setCreatingJob] = useState(false)
  
  // Employer layout state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [employerProfileData, setEmployerProfileData] = useState<EmployerProfile | null>(null)
  
  // Notifications for employer layout
  const { 
    notifications, 
    unreadCount: notificationCount, 
    loading: notificationsLoading,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead
  } = useNotifications(user?.id)
  const [jobFormData, setJobFormData] = useState<JobFormData>({
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

  useEffect(() => {
    if (!authLoading) {
      loadProfile()
    }
  }, [authLoading, workerId, user])
  
  // Handle profile updated success banner
  useEffect(() => {
    if (wasUpdated) {
      setShowUpdateSuccess(true)
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [wasUpdated])
  
  // Load employer profile data for sidebar display
  useEffect(() => {
    const loadEmployerProfileForSidebar = async () => {
      if (!user || role !== 'employer') return
      const empProfile = await getEmployerProfile(user.id)
      setEmployerProfileData(empProfile)
    }
    loadEmployerProfileForSidebar()
  }, [user, role])
  
  // Load employer data if current user is an employer viewing someone else's profile
  useEffect(() => {
    const loadEmployerData = async () => {
      if (!user || !profile || !workerId || workerId === user.id || role !== 'employer') {
        setIsEmployer(false)
        return
      }
      
      const employerProfile = await getEmployerProfile(user.id)
      if (!employerProfile) {
        setIsEmployer(false)
        return
      }
      
      setIsEmployer(true)
      setEmployerId(employerProfile.id)
      setEmployerProfileData(employerProfile)
      
      // Load employer's jobs and worker's applications (includes both applied and direct_offer origin)
      const [allJobs, applications] = await Promise.all([
        getJobPostings(),
        getWorkerApplicationsToEmployer(workerId, employerProfile.id),
      ])

      // Filter jobs to only include this employer's jobs
      const myJobs = allJobs.filter(job => job.employer_id === employerProfile.id)
      setEmployerJobs(myJobs)
      setWorkerApplications(applications)
      // Derive sent job IDs from direct offers in job_applications (origin='direct_offer')
      setSentJobIds(new Set(applications.filter(a => a.origin === 'direct_offer').map(a => a.job_id)))
    }
    
    loadEmployerData()
  }, [user, profile, workerId, role])

  const loadProfile = async () => {
    setLoading(true)
    const userId = workerId || user?.id
    if (!userId) {
      router.push('/login')
      return
    }

    const workerProfile = await getWorkerProfile(userId)
    if (workerProfile) {
      setProfile(workerProfile)
      // Load experience entries
      const experience = await getWorkerExperience(userId)
      setExperienceEntries(experience)
    } else if (!workerId) {
      router.push('/worker/profile')
    }
    setLoading(false)
  }
  
  /**
   * Handle sending a job offer to the worker
   */
  const handleSendOffer = async (jobId: string) => {
    if (!profile || !employerId) return
    
    setSendingOffer(true)
    try {
      const job = employerJobs.find(j => j.id === jobId)
      if (!job) {
        setToast({ message: 'Job not found', type: 'error' })
        return
      }
      
      const result = await sendDirectOffer(jobId, profile.id)

      if (result.success) {
        setSentJobIds(prev => new Set(prev).add(jobId))
        setToast({ message: `Job offer sent to ${profile.full_name}!`, type: 'success' })
        setShowContactModal(false)
      } else {
        setToast({
          message: result.error === 'worker_already_applied'
            ? 'This worker has already applied to this position.'
            : result.error === 'worker_declined_offer'
              ? 'This worker has previously declined an offer for this position and cannot be re-offered.'
              : 'Failed to send job offer. Please try again.',
          type: 'error'
        })
      }
    } catch (error) {
      logError('ViewWorkerProfile', error, undefined, 'Error sending job offer')
      setToast({ message: 'Failed to send job offer. Please try again.', type: 'error' })
    } finally {
      setSendingOffer(false)
    }
  }

  /**
   * Handle sending a direct message to the worker (without job offer)
   */
  const handleMessageDirectly = async (message: string) => {
    if (!profile || !employerId) return
    
    setSendingOffer(true)
    try {
      const { createDirectConversation } = await import('@/lib/db')
      const conversation = await createDirectConversation(profile.id, message)
      
      if (conversation) {
        setShowContactModal(false)
        setToast({ message: `Message sent to ${profile.full_name}!`, type: 'success' })
        // Navigate to the conversation
        router.push(`/messages?conversationId=${conversation.id}`)
      } else {
        setToast({ message: 'Failed to send message. Please try again.', type: 'error' })
      }
    } catch (error) {
      logError('ViewWorkerProfile', error, undefined, 'Error sending direct message')
      setToast({ message: 'Failed to send message. Please try again.', type: 'error' })
    } finally {
      setSendingOffer(false)
    }
  }
  
  /**
   * Handle contacting about an application - creates/gets conversation and redirects to messages
   */
  const handleContactAboutApplication = async (applicationId: string, jobId: string) => {
    if (!profile || !employerId) {
      setToast({ message: 'Unable to start conversation', type: 'error' })
      return
    }
    
    setSendingOffer(true)
    try {
      // Create or get the conversation for this application
      const conversation = await createOrGetConversationFromApplication(
        applicationId,
        jobId,
        profile.id,
        employerId
      )
      
      if (conversation) {
        setShowContactModal(false)
        // Redirect to the specific conversation
        router.push(`/messages?conversationId=${conversation.id}`)
      } else {
        setToast({ message: 'Failed to create conversation. Please try again.', type: 'error' })
      }
    } catch (error) {
      logError('ViewWorkerProfile', error, undefined, 'Error creating conversation')
      setToast({ message: 'Failed to create conversation. Please try again.', type: 'error' })
    } finally {
      setSendingOffer(false)
    }
  }
  
  const handleAcceptApplication = async (applicationId: string) => {
    setSendingOffer(true)
    try {
      const success = await updateApplicationStatus(applicationId, 'accepted')
      if (success) {
        setWorkerApplications(prev =>
          prev.map(app => app.id === applicationId ? { ...app, status: 'accepted' } : app)
        )
        setToast({ message: t('application_accepted' as any) || 'Application accepted', type: 'success' })
      } else {
        setToast({ message: t('error_updating_application' as any) || 'Failed to update application', type: 'error' })
      }
    } catch (error) {
      logError('ViewWorkerProfile', error, undefined, 'Error accepting application')
      setToast({ message: 'Failed to accept application', type: 'error' })
    } finally {
      setSendingOffer(false)
    }
  }

  const handleRejectApplication = async (applicationId: string) => {
    const confirmMessage = t('reject_application_confirm' as any) || 'Are you sure you want to reject this application?'
    if (!confirm(confirmMessage)) return

    setSendingOffer(true)
    try {
      const success = await updateApplicationStatus(applicationId, 'rejected')
      if (success) {
        setWorkerApplications(prev =>
          prev.map(app => app.id === applicationId ? { ...app, status: 'rejected' } : app)
        )
        setToast({ message: t('application_rejected' as any) || 'Application rejected', type: 'success' })
      } else {
        setToast({ message: t('error_updating_application' as any) || 'Failed to update application', type: 'error' })
      }
    } catch (error) {
      logError('ViewWorkerProfile', error, undefined, 'Error rejecting application')
      setToast({ message: 'Failed to reject application', type: 'error' })
    } finally {
      setSendingOffer(false)
    }
  }

  /**
   * Handle creating a new job for this worker
   */
  const handleCreateNewJob = () => {
    setShowContactModal(false)
    setShowCreateJobModal(true)
  }
  
  /**
   * Update job form field
   */
  const updateJobFormField = <K extends keyof JobFormData>(field: K, value: JobFormData[K]) => {
    setJobFormData(prev => ({ ...prev, [field]: value }))
  }
  
  /**
   * Handle job creation submission
   */
  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profile || !employerId || creatingJob) return
    
    if (!jobFormData.title.trim() || !jobFormData.description.trim()) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    const today = new Date().toISOString().split('T')[0]
    if (jobFormData.start_date && jobFormData.start_date < today) {
      setToast({ message: t('start_date_not_in_past'), type: 'error' })
      return
    }

    if (jobFormData.end_date && jobFormData.start_date && jobFormData.end_date <= jobFormData.start_date) {
      setToast({ message: t('end_date_after_start'), type: 'error' })
      return
    }

    setCreatingJob(true)
    
    try {
      const jobData = {
        employer_id: employerId,
        ...jobFormData,
        end_date: jobFormData.end_date || null,
        visibility: 'private' as const,
        status: 'active' as const,
      }
      
      const newJob = await createJobPosting(jobData)
      
      if (newJob) {
        const result = await sendDirectOffer(newJob.id, profile.id)

        if (result.success) {
          setToast({ message: `${t('job_created_offer_sent')} ${profile.full_name}!`, type: 'success' })
        } else {
          setToast({ message: t('job_created_offer_send_failed'), type: 'info' })
        }
        
        setShowCreateJobModal(false)
        setJobFormData({
          title: '',
          description: '',
          work_type: 'construction',
          years_of_experience: 0,
          salary_range: 'negotiable',
          certification_requirements: [],
          language_requirements: [],
          start_date: '',
          end_date: '',
          job_type: 'permanent',
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
      logError('ViewWorkerProfile', error, undefined, 'Error creating job')
      setToast({ message: 'Failed to create job posting', type: 'error' })
    } finally {
      setCreatingJob(false)
    }
  }
  
  /**
   * Cancel job creation
   */
  const handleCancelJobCreation = () => {
    setShowCreateJobModal(false)
    setJobFormData({
      title: '',
      description: '',
      work_type: 'construction',
      years_of_experience: 0,
      salary_range: 'negotiable',
      certification_requirements: [],
      language_requirements: [],
      start_date: '',
      end_date: '',
      job_type: 'permanent',
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

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  // Common props for EmployerLayoutWrapper
  const employerLayoutProps = {
    mobileMenuOpen,
    setMobileMenuOpen,
    isNotificationDropdownOpen,
    setIsNotificationDropdownOpen,
    employerProfileData,
    notifications,
    notificationsLoading,
    notificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    t
  }

  // Loading state
  if (authLoading || loading) {
    // Show employer layout for employers
    if (role === 'employer') {
    return (
        <EmployerLayoutWrapper {...employerLayoutProps}>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 border-2 border-slate-200 rounded-full"></div>
                <div className="absolute inset-0 w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <span className="text-sm font-medium text-slate-500">{t('loading') || 'Loading...'}</span>
            </div>
          </div>
        </EmployerLayoutWrapper>
      )
    }
    
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500">{t('loading') || 'Loading...'}</span>
          </div>
        </div>
      </div>
    )
  }

  // Profile not found state
  if (!profile) {
    if (role === 'employer') {
    return (
        <EmployerLayoutWrapper {...employerLayoutProps}>
          <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <User className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">{t('profile_not_found' as any) || 'Profile not found'}</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                {t('profile_not_found_description' as any) || "This profile doesn't exist or has been removed."}
              </p>
            </div>
          </div>
        </EmployerLayoutWrapper>
      )
    }
    
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <User className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">{t('profile_not_found' as any) || 'Profile not found'}</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {t('profile_not_found_description' as any) || "This profile doesn't exist or has been removed."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isOwnProfile = !workerId || workerId === user?.id
  const initials = getInitials(profile.full_name)
  const primaryLocation = profile.preferred_locations?.[0] ? getLocationDisplay(profile.preferred_locations[0]) : null
  const workAuthConfig = profile.work_authorization?.status ? getWorkAuthConfig(profile.work_authorization.status, t) : null

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

  // Profile content - shared between layouts
  const profileContent = (
    <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-4 lg:py-4 pb-24 lg:pb-6">

        {/* Back button for employers */}
        {isEmployer && (
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 mb-4 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            {t('back') || 'Back'}
          </button>
        )}

        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-5 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Left: Photo + Name */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Profile Image */}
                  {profile.profile_image_url ? (
                <div className="w-14 h-14 lg:w-14 lg:h-14 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-slate-100">
                      <img
                        src={profile.profile_image_url}
                        alt={profile.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                <div className="w-14 h-14 lg:w-14 lg:h-14 bg-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-slate-600">{initials}</span>
                    </div>
                  )}
              
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl lg:text-xl font-semibold text-slate-900 truncate">{profile.full_name}</h1>
                  {profile.date_of_birth && (
                    <span className="text-base text-slate-400 font-normal">
                      {calculateAge(profile.date_of_birth)} {t('years_old') || 'years old'}
                    </span>
                  )}
                </div>
                  {profile.work_types && profile.work_types.length > 0 && (
                  <p className="text-base text-slate-500">
                      {profile.work_types.slice(0, 2).map(type => t(type)).join(' & ')}
                    </p>
                  )}
              </div>
                </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 lg:gap-3">
                  {isOwnProfile ? (
                <>
                    <Link
                      href="/worker/profile"
                    className="flex items-center justify-center gap-2 px-4 py-3 lg:py-2.5 bg-slate-800 text-white text-base font-medium rounded-xl hover:bg-slate-900 transition-colors"
                    >
                      <Edit3 className="w-5 h-5" />
                    {t('edit_profile') || 'Edit Profile'}
                    </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 px-4 py-3 lg:py-2.5 bg-slate-100 text-slate-700 text-base font-medium rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    {t('logout') || 'Logout'}
                  </button>
                </>
                  ) : isEmployer ? (
                    <button
                      onClick={() => setShowContactModal(true)}
                      data-testid="employer-contact-button"
                  className="flex items-center justify-center gap-2 px-4 py-3 lg:py-2.5 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition-colors text-base"
                    >
                      {workerApplications.filter(a => a.status === 'pending').length > 0 ? (
                        <>
                          <Inbox className="w-5 h-5" />
                          {t('respond_to_applications' as any) || 'Respond'}
                          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                            {workerApplications.filter(a => a.status === 'pending').length}
                          </span>
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          {t('send_offer') || 'Send Offer'}
                        </>
                      )}
                    </button>
                  ) : (
                    <Link
                      href="/messages"
                  className="flex items-center justify-center gap-2 px-4 py-3 lg:py-2.5 bg-slate-800 text-white text-base font-medium rounded-xl hover:bg-slate-900 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      {t('send_message') || 'Message'}
                    </Link>
                  )}
                </div>
              </div>
          
          {/* Tags Row - Location, Availability */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
            {primaryLocation && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium border border-slate-200">
                <MapPin className="w-4 h-4 text-slate-400" />
                {primaryLocation.text}
              </span>
            )}
            {profile.available_immediately && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-200">
                <Calendar className="w-4 h-4 text-emerald-600" />
                {t('available_immediately')}
              </span>
            )}
            </div>
          </div>

        {/* Key Highlights Card - Work Permit, Languages, Nationality, Sector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Work Authorization */}
            {workAuthConfig && (
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-200">
                  <workAuthConfig.icon className="w-5 h-5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">
                    {t('work_permit') || 'Work Permit'}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {workAuthConfig.label}
                  </p>
                  {/* Show countries for permanent resident or work permit holder */}
                  {(profile.work_authorization!.status === 'permanent_resident' || 
                    profile.work_authorization!.status === 'work_permit_holder') && 
                    profile.work_authorization!.countries && 
                    profile.work_authorization!.countries.length > 0 && (
                    <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1 flex-wrap">
                      {profile.work_authorization!.countries.slice(0, 2).map(code => (
                        <span key={code} className="inline-flex items-center gap-0.5">
                          <FlagIcon code={code} size="xs" />
                        </span>
                      ))}
                      {profile.work_authorization!.countries.length > 2 && 
                        <span className="text-slate-400">+{profile.work_authorization!.countries.length - 2}</span>
                      }
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Languages */}
            {profile.languages && profile.languages.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-200">
                  <Languages className="w-5 h-5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    {t('languages') || 'Languages'}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {profile.languages.slice(0, 5).map(lang => (
                      <span
                        key={lang}
                        title={LANGUAGE_NAMES[lang] || lang.toUpperCase()}
                      >
                        {LANGUAGE_COUNTRY_CODES[lang]
                          ? <FlagIcon code={LANGUAGE_COUNTRY_CODES[lang]} size="md" />
                          : <Globe className="w-4 h-3.5 text-slate-400" />
                        }
                      </span>
                    ))}
                    {profile.languages.length > 5 && (
                      <span className="text-xs font-medium text-slate-500 ml-0.5">
                        +{profile.languages.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Nationality */}
            {profile.nationality && (
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-200">
                  <Globe2 className="w-5 h-5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">
                    {t('nationality') || 'Nationality'}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    {KNOWN_COUNTRY_CODES.has(profile.nationality)
                      ? <FlagIcon code={profile.nationality} size="md" />
                      : <Globe className="w-4 h-3.5 text-slate-400" />
                    }
                    {COUNTRY_NAMES[profile.nationality] || profile.nationality}
                  </p>
                </div>
              </div>
            )}

            {/* Sector/Work Types */}
            {profile.work_types && profile.work_types.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-200">
                  <Briefcase className="w-5 h-5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">
                    {t('sector') || 'Sector'}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {profile.work_types.slice(0, 2).map(type => t(type)).join(', ')}
                    {profile.work_types.length > 2 && ` +${profile.work_types.length - 2}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* About Section */}
            <div 
              className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: '0ms' }}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" />
                {t('about') || 'About'} {profile.full_name}
              </h2>
              {profile.bio ? (
                <div className="relative">
                  <p className={`text-slate-600 text-base leading-relaxed whitespace-pre-wrap ${!showFullBio && profile.bio.length > 400 ? 'line-clamp-5' : ''}`}>
                    {translations.bio?.visible ? translations.bio.text : profile.bio}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    {profile.bio.length > 400 && (
                      <button
                        onClick={() => setShowFullBio(!showFullBio)}
                        className="text-slate-600 hover:text-slate-900 font-medium text-base flex items-center gap-1.5"
                      >
                        {showFullBio ? t('show_less') || 'Show less' : t('read_more') || 'Read more'}
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                    {!isOwnProfile && (
                      <button
                        onClick={() => handleTranslate('bio', profile.bio!)}
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
                    )}
                  </div>
                </div>
              ) : isOwnProfile ? (
              <div className="text-center py-6">
                  <p className="text-slate-400 text-base mb-3">
                    {t('no_bio_yet')}
                  </p>
                  <Link
                    href="/worker/profile"
                    className="inline-flex items-center gap-2 px-4 py-2 text-base text-slate-600 hover:text-slate-900 font-medium"
                  >
                    <Edit3 className="w-4 h-4" />
                    {t('add_bio')}
                  </Link>
                  </div>
              ) : (
                <p className="text-slate-400 text-base italic">
                  {t('no_bio_available')}
                </p>
              )}
            </div>

            {/* Experience Section */}
            {(profile.experience || experienceEntries.length > 0) && (
              <div 
                className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: '50ms' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-slate-400" />
                    {t('experience') || 'Experience'}
                  </h2>
                  {!isOwnProfile && profile.experience && (
                    <button
                      onClick={() => handleTranslate('experience', profile.experience!)}
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
                  )}
                </div>
                
                {/* Experience Entries from Database (Auto-tracked) */}
                {experienceEntries.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {experienceEntries.map((exp) => {
                      const startDate = new Date(exp.start_date)
                      const endDate = exp.end_date ? new Date(exp.end_date) : null
                      const isCurrent = !endDate
                      
                      return (
                        <div key={exp.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 text-base mb-1">
                                {exp.job_title}
                              </h3>
                              <p className="text-slate-600 text-sm mb-2">{exp.company_name}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                {exp.work_type && (
                                  <span className="px-2 py-1 bg-white rounded border border-slate-200">
                                    {t(exp.work_type as TranslationKey)}
                                  </span>
                                )}
                                {(exp.location_city || exp.location_country) && (
                                  <span className="flex items-center gap-1 px-2 py-1 bg-white rounded border border-slate-200">
                                    <MapPin className="w-3 h-3" />
                                    {exp.location_city}
                                    {exp.location_city && exp.location_country && ', '}
                                    {exp.location_country && (
                                      COUNTRY_NAMES[exp.location_country] || exp.location_country.toUpperCase()
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {startDate.toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric'
                              })}
                              {exp.source_type !== 'hired' && (
                                <>
                                  {' – '}
                                  {isCurrent ? (
                                    <span className="text-emerald-600 font-medium">{t('present' as TranslationKey) || 'Present'}</span>
                                  ) : (
                                    endDate?.toLocaleDateString('en-US', {
                                      month: 'short',
                                      year: 'numeric'
                                    })
                                  )}
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* Manual Text Experience (User-written) */}
                {profile.experience && (
                  <div className={experienceEntries.length > 0 ? 'mt-4 pt-4 border-t border-slate-200' : ''}>
                    <p className="text-slate-600 text-base leading-relaxed whitespace-pre-wrap">
                      {translations.experience?.visible ? translations.experience.text : profile.experience}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Certifications */}
            {profile.certifications && profile.certifications.length > 0 && (
              <div 
                className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: '100ms' }}
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-slate-400" />
                  {t('certifications') || 'Certifications'}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.certifications.map((cert, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm border border-slate-200"
                    >
                      {getCertificateName(cert, t)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Contact & Details */}
          <div className="space-y-4">
            
            {/* Contact Information */}
            <div 
              className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: '100ms' }}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('contact_info') || 'Contact Information'}</h2>
              <div className="space-y-3">
                {/* Email - only for own profile */}
                {isOwnProfile && user?.email && (
                  <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                      <Mail className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 mb-0.5">{t('email') || 'Email'}</p>
                      <p className="text-base text-slate-900 font-medium truncate">{user.email}</p>
                    </div>
                  </div>
                )}

                {/* Phone - only for own profile */}
                {isOwnProfile && user?.phone && (
                  <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                      <Phone className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 mb-0.5">{t('phone') || 'Phone'}</p>
                      <p className="text-base text-slate-900 font-medium">{user.phone}</p>
                    </div>
                  </div>
                )}

                {/* Non-owner notice */}
                {!isOwnProfile && (
                  <p className="text-slate-500 text-base p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    {t('contact_via_message') || 'Contact this worker via the message button above.'}
                  </p>
                )}
              </div>
            </div>
            
            {/* Authorized Countries */}
            {profile.work_authorization?.countries && profile.work_authorization.countries.length > 0 && (
              <div 
                className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: '150ms' }}
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('authorized_countries') || 'Authorized Countries'}</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.work_authorization.countries.map(code => (
                    <span 
                      key={code}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-lg text-sm font-medium text-slate-700 border border-slate-100"
                    >
                      <FlagIcon code={code} size="md" />
                      {COUNTRY_NAMES[code] || code.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Preferred Locations */}
            {profile.preferred_locations && profile.preferred_locations.length > 0 && (
              <div 
                className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: '200ms' }}
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('preferred_locations') || 'Preferred Locations'}</h2>
                <div className="space-y-2">
                  {profile.preferred_locations.map((loc, index) => {
                    const { countryCode, text } = getLocationDisplay(loc)
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        {countryCode
                          ? <FlagIcon code={countryCode} size="md" />
                          : <Globe className="w-4 h-3.5 text-slate-400 shrink-0" />
                        }
                        <span className="text-slate-700 text-base font-medium">{text}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quick Actions - Only for own profile */}
            {isOwnProfile && (
              <div 
                className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: '250ms' }}
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('quick_actions') || 'Quick Actions'}</h2>
                <div className="space-y-3">
                  <Link
                    href="/worker/jobs"
                    className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                      <Briefcase className="w-5 h-5 text-slate-500" />
                  </div>
                    <span className="text-base text-slate-700 font-medium group-hover:text-slate-900">{t('browse_jobs') || 'Browse Jobs'}</span>
                  </Link>
                  <Link
                    href="/worker/applications"
                    className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                      <FileText className="w-5 h-5 text-slate-500" />
                </div>
                    <span className="text-base text-slate-700 font-medium group-hover:text-slate-900">{t('my_applications') || 'My Applications'}</span>
                  </Link>
              </div>
              </div>
            )}
            
            {/* Profile Visibility Notice */}
            {isOwnProfile && (
              <div 
                className="bg-slate-100 rounded-2xl border border-slate-200 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: '300ms' }}
              >
                <div className="flex items-start gap-3">
                  <Globe2 className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-base font-medium text-slate-800 mb-0.5">
                      {t('public_profile') || 'Public Profile'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {t('profile_visible_employers') || 'Your profile is visible to employers looking for workers.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Empty state for incomplete profile */}
            {isOwnProfile && !profile.bio && !profile.experience && (
              <div 
                className="bg-slate-100 rounded-2xl border border-slate-200 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: '350ms' }}
              >
                <div className="flex items-start gap-3">
                  <Edit3 className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-base font-medium text-slate-800 mb-0.5">
                      {t('complete_profile') || 'Complete Your Profile'}
                    </p>
                    <p className="text-sm text-slate-600 mb-2">
                      {t('add_bio_experience')}
                    </p>
                    <Link
                      href="/worker/profile"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      {t('edit_profile') || 'Edit Profile'}
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  )
      
  // Modals - rendered outside of layout
  const modals = (
    <>
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Profile Update Success Toast */}
      {showUpdateSuccess && (
        <Toast
          message={t('profile_updated_successfully') || 'Profile updated successfully'}
          type="success"
          onClose={() => setShowUpdateSuccess(false)}
        />
      )}
      
      {/* Contact Worker Modal - For employers */}
      {showContactModal && profile && isEmployer && (
        <ContactWorkerFromProfileModal
          worker={profile}
          jobs={employerJobs}
          applications={workerApplications}
          onClose={() => setShowContactModal(false)}
          onSendOffer={handleSendOffer}
          onCreateNewJob={handleCreateNewJob}
          onContactAboutApplication={handleContactAboutApplication}
          onAcceptApplication={handleAcceptApplication}
          onRejectApplication={handleRejectApplication}
          sending={sendingOffer}
          sentJobIds={sentJobIds}
        />
      )}
      
      {/* Create Job Modal - For creating a new job offer */}
      {showCreateJobModal && (
        <CreateJobModal
          formData={jobFormData}
          updateField={updateJobFormField}
          onSubmit={handleCreateJobSubmit}
          onCancel={handleCancelJobCreation}
          creating={creatingJob}
          isOffer={true}
        />
      )}
    </>
  )

  // Render with appropriate layout based on user role
  if (role === 'employer') {
    return (
      <>
        <EmployerLayoutWrapper {...employerLayoutProps}>
          {profileContent}
        </EmployerLayoutWrapper>
        {modals}
      </>
    )
  }

  // Default: Worker or guest view with regular Navbar
  return (
    <div className="min-h-screen bg-slate-50" data-testid="worker-view-profile-page">
      <Navbar />
      {profileContent}
      {modals}
    </div>
  )
}

export default function WorkerProfileViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500">Loading...</span>
          </div>
        </div>
      </div>
    }>
      <WorkerProfileViewContent />
    </Suspense>
  )
}

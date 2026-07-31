'use client'

/**
 * Employer Profile View Page
 *
 * Displays a company's public profile with a clean, professional design.
 * Matches the Jobs page layout for consistency.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { getEmployerProfile, applyToJobAtomic, getWorkerProfile, getApplicationsByWorker } from '@/lib/db'
import { logError } from '@/lib/logger'
import { getJobPostingsByEmployer } from '@/lib/db/jobPostings'
import type { EmployerProfile, JobPosting, Language as LanguageType, WorkerProfile } from '@/lib/types'
import { translateCountryCode } from '@/lib/utils/countryTranslation'
import { languageDisplay } from '@/components/shared/FilterPanel'
import { Toast } from '@/components/ui/Toast'
import { FlagIcon } from '@/components/ui/FlagIcon'
import dynamic from 'next/dynamic'
const ApplyJobModal = dynamic(() => import('@/components/worker/ApplyJobModal').then(m => ({ default: m.ApplyJobModal })), { ssr: false })
const CompleteProfileModal = dynamic(() => import('@/components/onboarding/CompleteProfileModal').then(m => ({ default: m.CompleteProfileModal })), { ssr: false })
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import {
  Edit3,
  LogOut,
  MapPin,
  Globe,
  Building2,
  Mail,
  Briefcase,
  ExternalLink,
  User,
  Calendar,
  FileText,
  Euro,
  Home,
  Utensils,
  FileCheck,
  ChevronRight,
  Clock,
  Languages,
  X,
  ArrowLeft
} from 'lucide-react'

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

type ProfileTab = 'overview' | 'jobs'

function EmployerProfileViewContent() {
  const { user, role, loading: authLoading, signOut } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const employerId = searchParams.get('id')
  const wasUpdated = searchParams.get('updated') === 'true'
  const [profile, setProfile] = useState<EmployerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(wasUpdated)
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview')
  const [employerJobs, setEmployerJobs] = useState<JobPosting[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsLoaded, setJobsLoaded] = useState(false)

  // Job detail panel state
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Apply state
  const [applying, setApplying] = useState<string | null>(null)
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [showApplyModal, setShowApplyModal] = useState<{ jobId: string; jobTitle: string } | null>(null)
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      loadProfile()
    }
  }, [authLoading, employerId, user])

  // Load worker profile and applications for apply functionality
  useEffect(() => {
    if (user?.id && role === 'worker') {
      getWorkerProfile(user.id).then(p => setWorkerProfile(p))
      getApplicationsByWorker(user.id).then(apps => {
        setAppliedJobIds(new Set(apps.map(a => a.job_id)))
      })
    }
  }, [user?.id, role])

  // Handle profile updated success banner
  useEffect(() => {
    if (wasUpdated) {
      setShowUpdateSuccess(true)
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [wasUpdated])

  const loadProfile = async () => {
    setLoading(true)
    const userId = employerId || user?.id
    if (!userId) {
      router.push('/login')
      return
    }

    const employerProfile = await getEmployerProfile(userId)
    if (employerProfile) {
      setProfile(employerProfile)
    } else if (!employerId) {
      router.push('/employer/profile')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  const loadEmployerJobs = async (eid: string) => {
    if (jobsLoaded) return
    setJobsLoading(true)
    const jobs = await getJobPostingsByEmployer(eid)
    setEmployerJobs(jobs.filter(j => j.status === 'active'))
    setJobsLoaded(true)
    setJobsLoading(false)
  }

  const handleJobsTabClick = () => {
    if (isOwnProfile) {
      router.push('/employer/jobs')
    } else {
      setActiveTab('jobs')
      setSelectedJob(null)
      setIsPanelOpen(false)
      const eid = employerId || user?.id
      if (eid) loadEmployerJobs(eid)
    }
  }

  const handleSelectJob = (job: JobPosting) => {
    setSelectedJob(job)
    setIsPanelOpen(true)
  }

  const handleCloseJobDetail = () => {
    setIsPanelOpen(false)
    setTimeout(() => setSelectedJob(null), 300)
  }

  const handleApply = (jobId: string, jobTitle?: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    if (!isProfileComplete(workerProfile)) {
      setShowCompleteProfileModal(true)
      return
    }
    setShowApplyModal({ jobId, jobTitle: jobTitle || '' })
  }

  const handleConfirmApply = async (jobId: string, message?: string) => {
    if (!user) return
    setApplying(jobId)
    try {
      const result = await applyToJobAtomic(jobId, user.id, message)
      if (result.success) {
        setAppliedJobIds(prev => new Set(prev).add(jobId))
      }
    } catch (error) {
      logError('ViewEmployerProfile', error, undefined, 'Error applying to job')
    }
    setApplying(null)
    setShowApplyModal(null)
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-sm font-medium text-slate-500">{t('loading') || 'Loading...'}</span>
        </div>
      </div>
    )
  }

  // Profile not found state
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20 sm:pb-6">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-12 text-center">
            <div className="w-14 h-14 sm:w-14 sm:h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Building2 className="w-7 h-7 sm:w-7 sm:h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">{t('company_not_found') || 'Company not found'}</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {t('company_not_found_description') || "This company profile doesn't exist."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isOwnProfile = !employerId || employerId === user?.id
  const isWorkerViewing = role === 'worker'

  const tabs: { key: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: t('overview') || 'Overview', icon: <User className="w-5 h-5" /> },
    { key: 'jobs', label: t('jobs') || 'Jobs', icon: <Briefcase className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-6 overflow-x-hidden" data-testid="employer-view-profile-page">
      {isWorkerViewing && <Navbar />}
      <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 py-3 lg:py-4 w-full">
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-5 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full">
              {profile.profile_image_url ? (
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-14 lg:h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-lg ring-2 ring-slate-100">
                  <img
                    src={profile.profile_image_url}
                    alt={profile.company_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                  <Building2 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-7 lg:h-7 text-white" />
                </div>
              )}

              <div className="min-w-0 flex-1 overflow-hidden">
                <h1 className="text-lg sm:text-xl lg:text-xl font-bold text-slate-900 break-words">{profile.company_name}</h1>
                {profile.industry && (
                  <p className="text-sm sm:text-base text-slate-500 break-words">{t(profile.industry as any) || profile.industry.replace(/_/g, ' ')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tags Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 pt-4 border-t border-slate-100">
            {(profile.city || profile.country) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[160px] sm:max-w-none">{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium">
              <Calendar className="w-4 h-4" />
              {new Date(profile.created_at).toLocaleDateString()}
            </span>
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                <Globe className="w-4 h-4 flex-shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-none">{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
              </a>
            )}
          </div>

          {/* Action Buttons - Own profile only */}
          {isOwnProfile && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-4 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <Link
                href="/employer/profile"
                className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-blue-600 text-white text-sm sm:text-base font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="whitespace-nowrap">{t('edit_profile') || 'Edit Profile'}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-white text-slate-600 text-sm sm:text-base font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="whitespace-nowrap">{t('logout') || 'Logout'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 mb-4 sm:mb-6 scrollbar-hide">
          <div className="inline-flex gap-2 p-1.5 bg-slate-100 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => tab.key === 'jobs' ? handleJobsTabClick() : setActiveTab(tab.key)}
                className={`flex-shrink-0 flex items-center justify-center gap-2 px-5 py-3 text-base font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">

          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">

            {/* About Section */}
            <div
              className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: '0ms' }}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="truncate">{t('about') || 'About'} {profile.company_name}</span>
              </h2>
              {profile.description ? (
                <p className="text-slate-600 text-base leading-relaxed whitespace-pre-wrap break-words">
                  {profile.description}
                </p>
              ) : isOwnProfile ? (
                <div className="text-center py-6">
                  <p className="text-slate-400 text-base mb-3">
                    {t('no_description_yet') || 'No description added yet.'}
                  </p>
                  <Link
                    href="/employer/profile"
                    className="inline-flex items-center gap-2 px-4 py-2 text-base text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Edit3 className="w-4 h-4" />
                    {t('add_description') || 'Add a description'}
                  </Link>
              </div>
              ) : (
                <p className="text-slate-400 text-base italic">
                  {t('no_description_available') || 'No description available.'}
                </p>
            )}
            </div>

            {/* Company Details Card */}
            {profile.address && (
              <div
                className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: '50ms' }}
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-400" />
                  {t('company_details') || 'Company Details'}
                </h2>
                <div className="space-y-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 gap-1">
                    <span className="text-slate-500 text-base">{t('address') || 'Address'}</span>
                    <span className="text-slate-900 text-base sm:text-right sm:max-w-[60%]">{profile.address}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Contact & Links */}
          <div className="space-y-3 sm:space-y-4">

            {/* Contact Information */}
            <div
              className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: '100ms' }}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('contact_info') || 'Contact Information'}</h2>
              <div className="space-y-3">
                {profile.website ? (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                      <Globe className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 mb-0.5">{t('website') || 'Website'}</p>
                      <p className="text-base text-slate-900 font-medium truncate group-hover:text-blue-600 transition-colors">
                        {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                  </a>
                ) : isOwnProfile ? (
                  <Link
                    href="/employer/profile"
                    className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border-2 border-dashed border-slate-200"
                  >
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                      <Globe className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="text-base text-slate-400">{t('add_website') || 'Add website URL'}</span>
                  </Link>
                ) : null}

                {isOwnProfile && user?.email && (
                  <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                      <Mail className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 mb-0.5">{t('email') || 'Email'}</p>
                      <p className="text-base text-slate-900 font-medium truncate">{user.email}</p>
                    </div>
                  </div>
                )}

                {(profile.city || profile.country) && (
                  <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                      <MapPin className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 mb-0.5">{t('location') || 'Location'}</p>
                      <p className="text-base text-slate-900 font-medium">
                        {[profile.city, profile.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions - Own profile */}
            {isOwnProfile && (
              <div
                className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: '150ms' }}
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('quick_actions') || 'Quick Actions'}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
                  <Link
                    href="/employer/jobs"
                    className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-base text-slate-700 font-medium group-hover:text-slate-900">{t('my_jobs') || 'My Jobs'}</span>
                  </Link>
                  <Link
                    href="/employer/workers"
                    className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-base text-slate-700 font-medium group-hover:text-slate-900">{t('find_workers') || 'Find Workers'}</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Profile Visibility Notice */}
            {isOwnProfile && (
              <div
                className="bg-blue-50 rounded-xl border border-blue-100 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: '200ms' }}
              >
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-base font-medium text-blue-900 mb-0.5">
                      {t('public_profile') || 'Public Profile'}
                    </p>
                    <p className="text-sm text-blue-700">
                      {t('profile_visible_public') || 'Your profile is visible to workers searching for jobs.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state for incomplete profile */}
            {isOwnProfile && !profile.description && !profile.website && (
              <div
                className="bg-amber-50 rounded-xl border border-amber-100 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: '250ms' }}
              >
                <div className="flex items-start gap-3">
                  <Edit3 className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-base font-medium text-amber-900 mb-0.5">
                      {t('complete_profile') || 'Complete Your Profile'}
                    </p>
                    <p className="text-sm text-amber-700 mb-2">
                      {t('add_company_details') || 'Add a description and website to help workers learn about your company.'}
                    </p>
                    <Link
                      href="/employer/profile"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800"
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
        ) : (
        /* Jobs Tab Content - Split panel layout like main jobs page */
        <div className="flex gap-0 lg:gap-4 relative" style={{ minHeight: 'calc(100vh - 300px)' }}>
          {/* Job List */}
          <div className={`transition-all duration-300 ${
            isPanelOpen && selectedJob
              ? 'hidden lg:block lg:w-[55%] xl:w-[60%]'
              : 'w-full'
          }`}>
            {jobsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 border-2 border-slate-200 rounded-full"></div>
                    <div className="absolute inset-0 w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <span className="text-sm font-medium text-slate-500">{t('loading') || 'Loading...'}</span>
                </div>
              </div>
            ) : employerJobs.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
                <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">{t('no_open_positions') || 'No open positions'}</h3>
                <p className="text-sm text-slate-500">
                  {t('no_jobs_from_company') || 'This company has no active job postings at the moment.'}
                </p>
              </div>
            ) : (
              <div className={`grid gap-3 sm:gap-4 ${
                isPanelOpen && selectedJob
                  ? 'grid-cols-1'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
                {employerJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => handleSelectJob(job)}
                    className={`group cursor-pointer bg-white rounded-2xl border transition-all duration-200 ${
                      selectedJob?.id === job.id
                        ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-lg'
                        : appliedJobIds.has(job.id)
                          ? 'border-slate-200 opacity-60 hover:opacity-80'
                          : 'border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {job.employer_profile_image_url ? (
                          <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 transition-all ${
                            selectedJob?.id === job.id
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
                            selectedJob?.id === job.id
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25'
                              : 'bg-slate-100 group-hover:bg-blue-50'
                          }`}>
                            <Briefcase className={`w-5 h-5 transition-colors ${selectedJob?.id === job.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h2 className={`font-semibold text-slate-900 leading-tight transition-colors line-clamp-2 ${
                            selectedJob?.id === job.id ? 'text-blue-600' : 'group-hover:text-blue-600'
                          }`}>
                            {job.title}
                          </h2>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-500 truncate">{job.company_name}</span>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${
                          selectedJob?.id === job.id
                            ? 'text-blue-500'
                            : 'text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5'
                        }`} />
                      </div>

                      {job.location_city && (
                        <div className="flex items-center gap-1.5 mt-3 text-sm text-slate-500">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{job.location_city}{job.location_country && `, ${translateCountryCode(job.location_country, language)}`}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                          <Euro className="w-3 h-3" />
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
                        {appliedJobIds.has(job.id) && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            {t('applied')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile backdrop overlay */}
          {isPanelOpen && selectedJob && (
            <div
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
              onClick={handleCloseJobDetail}
            />
          )}

          {/* Detail Panel - sidebar on desktop, fullscreen overlay on mobile */}
          <div className={`bg-white overflow-hidden transition-all duration-300 ${
            isPanelOpen && selectedJob
              ? 'fixed inset-0 w-full z-[70] shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:w-[45%] xl:w-[40%] lg:shadow-none lg:border lg:border-slate-200 lg:rounded-2xl'
              : 'w-0 hidden lg:block lg:border lg:border-slate-200 lg:rounded-2xl'
          }`}>
            {selectedJob && (
              <div className="h-full flex flex-col bg-white lg:max-h-[calc(100vh-300px)] lg:sticky lg:top-4">
                {/* Header */}
                <div className="flex-shrink-0 p-6 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {selectedJob.employer_profile_image_url ? (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-slate-100 shadow-lg flex-shrink-0">
                          <img
                            src={selectedJob.employer_profile_image_url}
                            alt={selectedJob.company_name}
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
                          {selectedJob.title}
                        </h2>
                        <div className="inline-flex items-center gap-1.5 mt-1 text-sm text-slate-500">
                          <Building2 className="w-4 h-4" />
                          <span className="font-medium">{selectedJob.company_name}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleCloseJobDetail}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quick info badges */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedJob.location_city && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium">
                        <MapPin className="w-3.5 h-3.5" />
                        {selectedJob.location_city}
                        {selectedJob.location_country && `, ${translateCountryCode(selectedJob.location_country, language as LanguageType)}`}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                      <Euro className="w-3.5 h-3.5" />
                      {selectedJob.salary_range
                        ? t(`salary_${selectedJob.salary_range}` as any) || selectedJob.salary_range.replace(/_/g, ' ')
                        : selectedJob.pay_netto && selectedJob.pay_netto > 0
                          ? `€${selectedJob.pay_netto}/mo`
                          : selectedJob.pay_brutto && selectedJob.pay_brutto > 0
                            ? `€${selectedJob.pay_brutto}/mo`
                            : t('salary_negotiable')}
                    </span>
                  </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-6 space-y-6">
                    {/* Description */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('description')}</h3>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {selectedJob.description}
                      </p>
                    </div>

                    {/* Job Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                          <Briefcase className="w-4 h-4" />
                          <span className="text-xs font-medium uppercase tracking-wide">{t('work_type')}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{t(selectedJob.work_type)}</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs font-medium uppercase tracking-wide">{t('start_date')}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">
                          {new Date(selectedJob.start_date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
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
                          {selectedJob.years_of_experience === 0 || selectedJob.years_of_experience === undefined
                            ? t('no_experience_required')
                            : `${selectedJob.years_of_experience}+ ${t('years')}`}
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                          <Euro className="w-4 h-4" />
                          <span className="text-xs font-medium uppercase tracking-wide">{t('salary')}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">
                          {selectedJob.salary_range
                            ? t(`salary_${selectedJob.salary_range}` as any) || selectedJob.salary_range.replace(/_/g, ' ')
                            : selectedJob.pay_netto && selectedJob.pay_netto > 0
                              ? `€${selectedJob.pay_netto}/mo`
                              : selectedJob.pay_brutto && selectedJob.pay_brutto > 0
                                ? `€${selectedJob.pay_brutto}/mo (${t('brutto')})`
                                : t('salary_negotiable')}
                        </p>
                      </div>
                    </div>

                    {/* Benefits */}
                    {(selectedJob.accommodation_included || selectedJob.food_included) && (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('benefits_perks')}</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.accommodation_included && (
                            <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 rounded-xl font-medium text-sm border border-emerald-100">
                              <Home className="w-4 h-4" />
                              {t('accommodation_included')}
                            </span>
                          )}
                          {selectedJob.food_included && (
                            <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 rounded-xl font-medium text-sm border border-emerald-100">
                              <Utensils className="w-4 h-4" />
                              {t('food_included')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Work Permit Info */}
                    {(selectedJob.work_permit_required || selectedJob.work_permit_sponsorship_offered) && (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('work_permit_requirements')}</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.work_permit_required && (
                            <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 rounded-xl font-medium text-sm border border-amber-100">
                              <FileCheck className="w-4 h-4" />
                              {t('work_permit_required')}
                            </span>
                          )}
                          {selectedJob.work_permit_sponsorship_offered && (
                            <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 rounded-xl font-medium text-sm border border-emerald-100">
                              <FileCheck className="w-4 h-4" />
                              {t('visa_sponsorship_available')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Language Requirements */}
                    {selectedJob.language_requirements && selectedJob.language_requirements.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('language_requirements') || 'Language Requirements'}</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.language_requirements.map((lang) => {
                            const langInfo = languageDisplay[lang as LanguageType] || { flag: '', name: lang }
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

                {/* Fixed Apply Button */}
                {isWorkerViewing && (
                  <div className="flex-shrink-0 p-6 border-t border-slate-100 bg-white">
                    <button
                      onClick={() => handleApply(selectedJob.id, selectedJob.title)}
                      disabled={applying === selectedJob.id || appliedJobIds.has(selectedJob.id)}
                      className={`w-full px-6 py-4 text-base rounded-xl font-semibold transition-all duration-300 ${
                        appliedJobIds.has(selectedJob.id)
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                          : applying === selectedJob.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5'
                      }`}
                    >
                      {applying === selectedJob.id
                        ? t('applying')
                        : appliedJobIds.has(selectedJob.id)
                          ? `✓ ${t('applied')}`
                          : t('apply')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Profile Update Success Toast */}
      {showUpdateSuccess && (
        <Toast
          message={t('profile_updated_successfully') || 'Profile updated successfully'}
          type="success"
          onClose={() => setShowUpdateSuccess(false)}
        />
      )}

      {/* Apply Modal */}
      <ApplyJobModal
        isOpen={!!showApplyModal}
        onClose={() => setShowApplyModal(null)}
        onApply={(message: string) => showApplyModal && handleConfirmApply(showApplyModal.jobId, message)}
        job={showApplyModal ? employerJobs.find(j => j.id === showApplyModal.jobId) || null : null}
        applying={!!showApplyModal && applying === showApplyModal.jobId}
      />

      {/* Complete Profile Modal */}
      <CompleteProfileModal
        isOpen={showCompleteProfileModal}
        onClose={() => setShowCompleteProfileModal(false)}
      />
    </div>
  )
}

export default function EmployerProfileViewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-sm font-medium text-slate-500">Loading...</span>
        </div>
      </div>
    }>
      <EmployerProfileViewContent />
    </Suspense>
  )
}

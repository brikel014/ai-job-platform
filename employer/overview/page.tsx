'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { useNotifications } from '@/components/navbar/hooks/useNotifications'
import {
  getJobPostingsByEmployer,
  getApplicationsByJob,
  getWorkerProfile
} from '@/lib/db'
import { getSupabaseClient } from '@/lib/db/utils'
import { createOrGetConversationFromApplication } from '@/lib/db/conversations'
import { logError } from '@/lib/logger'
import type { JobPosting, JobApplication, WorkerProfile, Notification } from '@/lib/types'
import {
  Users,
  Briefcase,
  Send,
  CheckCircle,
  CheckCircle2,
  FileText,
  Bell,
  Clock,
  TrendingUp,
  UserCheck,
  XCircle,
  ChevronRight,
  Mail,
  Plus,
  MessageCircle,
  X,
  Calendar
} from 'lucide-react'

interface ApplicationWithDetails extends JobApplication {
  worker?: WorkerProfile | null
  jobTitle?: string
}

interface HiredWorkerEntry {
  applicationId: string
  worker: WorkerProfile
  jobTitle: string
  hiredAt: string
  jobStartDate: string
}

interface DashboardStats {
  totalJobs: number
  activeJobs: number
  totalHired: number
  pendingApplications: number
  pendingOffers: number
  totalApplications: number
}

export default function EmployerOverviewPage() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    totalHired: 0,
    pendingApplications: 0,
    pendingOffers: 0,
    totalApplications: 0
  })
  const [recentApplications, setRecentApplications] = useState<ApplicationWithDetails[]>([])
  const [hiredWorkers, setHiredWorkers] = useState<HiredWorkerEntry[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'hired'>('overview')
  const [loading, setLoading] = useState(true)
  const [dismissedHiredIds, setDismissedHiredIds] = useState<Set<string>>(new Set())
  const [messagingApp, setMessagingApp] = useState<string | null>(null)

  // Load dismissed IDs from localStorage
  useEffect(() => {
    if (!user?.id) return
    try {
      const stored = localStorage.getItem(`employer_hired_ack_${user.id}`)
      if (stored) setDismissedHiredIds(new Set(JSON.parse(stored)))
    } catch {}
  }, [user?.id])

  const dismissHiredApplication = useCallback((appId: string) => {
    setDismissedHiredIds(prev => {
      const next = new Set([...prev, appId])
      if (user?.id) {
        try {
          localStorage.setItem(`employer_hired_ack_${user.id}`, JSON.stringify([...next]))
        } catch {}
      }
      return next
    })
  }, [user?.id])

  const handleMessageWorker = useCallback(async (app: ApplicationWithDetails) => {
    if (!user?.id || !app.worker) return
    setMessagingApp(app.id)
    try {
      const conversation = await createOrGetConversationFromApplication(
        app.id, app.job_id, app.worker.id, user.id
      )
      if (conversation) router.push(`/messages?conversationId=${conversation.id}`)
    } finally {
      setMessagingApp(null)
    }
  }, [user?.id, router])
  
  const { 
    notifications, 
    unreadCount,
    loading: notificationsLoading,
    markAsRead
  } = useNotifications(user?.id)

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Fetch all jobs for this employer
      const jobs = await getJobPostingsByEmployer(user.id)
      
      // Count direct offers with 'offered' status (pending worker response)
      const jobIds = jobs.map(j => j.id)
      let pendingOffers = 0
      if (jobIds.length > 0) {
        const supabase = getSupabaseClient()
        const { count } = await supabase
          .from('job_applications')
          .select('*', { count: 'exact', head: true })
          .in('job_id', jobIds)
          .eq('origin', 'direct_offer')
          .eq('status', 'offered')
        pendingOffers = count || 0
      }

      // Calculate stats
      const activeJobs = jobs.filter(j => j.status === 'active').length
      const totalHired = jobs.reduce((sum, job) => sum + (job.positions_filled || 0), 0)
      
      // Fetch applications for all active jobs
      const allApplications: ApplicationWithDetails[] = []
      let pendingApplicationsCount = 0
      
      for (const job of jobs.filter(j => j.status === 'active')) {
        const applications = await getApplicationsByJob(job.id)
        pendingApplicationsCount += applications.filter(a => a.status === 'pending').length
        
        // Add job title to each application
        for (const app of applications) {
          allApplications.push({
            ...app,
            jobTitle: job.title
          })
        }
      }
      
      // Sort by date and get recent ones
      allApplications.sort((a, b) => 
        new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
      )
      
      // Fetch worker profiles for recent applications (limit to 5)
      const recentApps = allApplications.slice(0, 5)
      const appsWithWorkers: ApplicationWithDetails[] = []
      
      for (const app of recentApps) {
        const worker = await getWorkerProfile(app.worker_id)
        appsWithWorkers.push({
          ...app,
          worker
        })
      }
      
      // Fetch all hired applications across all jobs (not just active)
      const hiredEntries: HiredWorkerEntry[] = []
      if (jobIds.length > 0) {
        const supabase = getSupabaseClient()
        const { data: hiredApps } = await supabase
          .from('job_applications')
          .select('id, worker_id, job_id, hired_at, status')
          .in('job_id', jobIds)
          .eq('status', 'hired')
          .order('hired_at', { ascending: false })

        if (hiredApps && hiredApps.length > 0) {
          const jobMap = new Map(jobs.map(j => [j.id, j]))
          for (const app of hiredApps) {
            const worker = await getWorkerProfile(app.worker_id)
            const job = jobMap.get(app.job_id)
            if (worker && job) {
              hiredEntries.push({
                applicationId: app.id,
                worker,
                jobTitle: job.title,
                hiredAt: app.hired_at || '',
                jobStartDate: job.start_date,
              })
            }
          }
        }
      }

      setStats({
        totalJobs: jobs.length,
        activeJobs,
        totalHired,
        pendingApplications: pendingApplicationsCount,
        pendingOffers,
        totalApplications: allApplications.length
      })

      setHiredWorkers(hiredEntries)
      setRecentApplications(appsWithWorkers)
    } catch (error) {
      logError('EmployerOverview', error, undefined, 'Error fetching dashboard data')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'application_received':
        return <FileText className="w-4 h-4 text-slate-400" />
      case 'application_accepted':
      case 'application_hired':
        return <CheckCircle className="w-4 h-4 text-slate-400" />
      case 'application_rejected':
        return <XCircle className="w-4 h-4 text-slate-400" />
      case 'job_offer':
        return <Mail className="w-4 h-4 text-slate-400" />
      default:
        return <Bell className="w-4 h-4 text-slate-400" />
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('just_now')
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      accepted: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      hired: 'bg-blue-100 text-blue-700',
      withdrawn: 'bg-slate-100 text-slate-600',
    }
    
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-slate-100 text-slate-600'}`}>
        {t(status as any) || status}
      </span>
    )
  }

  if (loading || authLoading) {
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

  return (
    <div className="min-h-screen bg-slate-50" data-testid="employer-overview-page">
      <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{t('overview') || 'Overview'}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {t('dashboard_subtitle') || 'Track your recruitment activity'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t('overview') || 'Overview'}
          </button>
          <button
            onClick={() => setActiveTab('hired')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'hired'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t('hired_workers') || 'Hired Workers'}
            {hiredWorkers.length > 0 && (
              <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
                activeTab === 'hired' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {hiredWorkers.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'overview' && (<>
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-5 h-5 text-slate-400" />
              <p className="text-sm sm:text-base text-slate-500">{t('active_jobs') || 'Active Jobs'}</p>
            </div>
            <p className="text-3xl sm:text-2xl font-semibold text-slate-900">{stats.activeJobs}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-5 h-5 text-slate-400" />
              <p className="text-sm sm:text-base text-slate-500">{t('people_hired') || 'People Hired'}</p>
            </div>
            <p className="text-3xl sm:text-2xl font-semibold text-slate-900">{stats.totalHired}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-slate-400" />
              <p className="text-sm sm:text-base text-slate-500">{t('pending_applications') || 'Pending'}</p>
            </div>
            <p className="text-3xl sm:text-2xl font-semibold text-slate-900">{stats.pendingApplications}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-5 h-5 text-slate-400" />
              <p className="text-sm sm:text-base text-slate-500">{t('pending_offers') || 'Offers Sent'}</p>
            </div>
            <p className="text-3xl sm:text-2xl font-semibold text-slate-900">{stats.pendingOffers}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-slate-400" />
              <p className="text-sm sm:text-base text-slate-500">{t('total_jobs_posted') || 'Total Jobs'}</p>
            </div>
            <p className="text-3xl sm:text-2xl font-semibold text-slate-900">{stats.totalJobs}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-slate-400" />
              <p className="text-sm sm:text-base text-slate-500">{t('total_applications') || 'Applications'}</p>
            </div>
            <p className="text-3xl sm:text-2xl font-semibold text-slate-900">{stats.totalApplications}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          
          {/* Recent Notifications */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-slate-400" />
                <h2 className="text-base sm:text-sm font-medium text-slate-900">{t('notifications') || 'Notifications'}</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-sm sm:text-xs font-medium rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <Link 
                href="/notifications" 
                className="text-sm sm:text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1"
              >
                {t('view_all') || 'View All'}
                <ChevronRight className="w-4 h-4 sm:w-3 sm:h-3" />
              </Link>
            </div>
            
            <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
              {notificationsLoading ? (
                <div className="p-6 text-center">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm sm:text-xs text-slate-500">{t('no_notifications') || 'No notifications yet'}</p>
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 sm:px-5 py-3 sm:py-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-slate-50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-base sm:text-sm text-slate-700 line-clamp-1 ${!notification.read ? 'font-medium' : ''}`}>
                            {notification.title}
                          </p>
                          <span className="text-sm sm:text-xs text-slate-400 flex-shrink-0">
                            {getTimeAgo(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm sm:text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Applications */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" />
                <h2 className="text-base sm:text-sm font-medium text-slate-900">{t('recent_applications') || 'Recent Applications'}</h2>
              </div>
              <Link 
                href="/employer/jobs" 
                className="text-sm sm:text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1"
              >
                {t('manage_jobs') || 'Manage Jobs'}
                <ChevronRight className="w-4 h-4 sm:w-3 sm:h-3" />
              </Link>
            </div>
            
            <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
              {recentApplications.length === 0 ? (
                <div className="p-6 text-center">
                  <FileText className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm sm:text-xs text-slate-500">{t('no_applications_yet') || 'No applications yet'}</p>
                </div>
              ) : (
                recentApplications.map((application) => {
                  const isHired = application.status === 'hired'
                  const isHighlighted = isHired && !dismissedHiredIds.has(application.id)
                  return (
                  <div
                    key={application.id}
                    className={`px-4 sm:px-5 py-3 sm:py-4 transition-colors ${
                      isHighlighted
                        ? 'bg-emerald-50 border-l-4 border-l-emerald-500 hover:bg-emerald-50/80'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Worker Avatar */}
                      <div className="flex-shrink-0 relative">
                        {application.worker?.profile_image_url ? (
                          <img
                            src={application.worker.profile_image_url}
                            alt={application.worker.full_name || 'Worker'}
                            className="w-10 h-10 sm:w-8 sm:h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 sm:w-8 sm:h-8 bg-slate-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 sm:w-4 sm:h-4 text-slate-400" />
                          </div>
                        )}
                        {isHighlighted && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-white">
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* Application Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            href={`/worker/view-profile?id=${application.worker_id}`}
                            className={`text-base sm:text-sm truncate font-medium transition-colors ${
                              isHighlighted ? 'text-emerald-900 hover:text-emerald-700' : 'text-slate-700 hover:text-slate-900'
                            }`}
                          >
                            {application.worker?.full_name || t('worker') || 'Worker'}
                          </Link>
                          {getStatusBadge(application.status)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm sm:text-xs text-slate-500 truncate">
                            {application.jobTitle}
                          </p>
                          <span className="text-sm sm:text-xs text-slate-400">
                            {getTimeAgo(application.applied_at)}
                          </span>
                        </div>
                        {isHighlighted && (
                          <p className="text-xs text-emerald-600 font-medium mt-1">
                            {t('worker_confirmed_position')}
                          </p>
                        )}
                      </div>

                      {/* Actions for hired applications */}
                      {isHighlighted && (
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                          <button
                            onClick={() => handleMessageWorker(application)}
                            disabled={messagingApp === application.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                            title={t('message_worker')}
                          >
                            {messagingApp === application.id ? (
                              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <MessageCircle className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">{t('message_worker')}</span>
                          </button>
                          <button
                            onClick={() => dismissHiredApplication(application.id)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors"
                            title={t('mark_as_read')}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pb-20 sm:pb-6">
          <h2 className="text-base sm:text-sm font-medium text-slate-900 mb-3">{t('quick_actions') || 'Quick Actions'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/employer/jobs/create"
              className="group bg-white rounded-xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-sm font-medium text-slate-900 group-hover:text-slate-700 transition-colors">
                    {t('create_job') || 'Create Job'}
                  </h3>
                  <p className="text-sm sm:text-xs text-slate-500 truncate">
                    {t('post_new_job') || 'Post a new job opening'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </Link>

            <Link
              href="/employer/workers"
              className="group bg-white rounded-xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-sm font-medium text-slate-900 group-hover:text-slate-700 transition-colors">
                    {t('browse_workers') || 'Browse Workers'}
                  </h3>
                  <p className="text-sm sm:text-xs text-slate-500 truncate">
                    {t('find_perfect_candidate') || 'Find your next hire'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </Link>

            <Link
              href="/employer/job-offers"
              className="group bg-white rounded-xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <Send className="w-5 h-5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-sm font-medium text-slate-900 group-hover:text-slate-700 transition-colors">
                    {t('job_offers') || 'Job Offers'}
                  </h3>
                  <p className="text-sm sm:text-xs text-slate-500 truncate">
                    {t('view_sent_offers') || 'Track your sent offers'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </Link>
          </div>
        </div>
        </>)}

        {/* Hired Workers Tab */}
        {activeTab === 'hired' && (
          <div className="pb-20 sm:pb-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-slate-400" />
                  <h2 className="text-base sm:text-sm font-medium text-slate-900">
                    {t('hired_workers') || 'Hired Workers'}
                  </h2>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                    {hiredWorkers.length}
                  </span>
                </div>
                <p className="text-sm sm:text-xs text-slate-500 mt-1">
                  {t('hired_workers_desc') || 'Workers you have hired and their positions'}
                </p>
              </div>

              {hiredWorkers.length === 0 ? (
                <div className="p-10 text-center">
                  <UserCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">{t('no_hired_workers') || 'No hired workers yet'}</p>
                  <p className="text-xs text-slate-400 mt-1">{t('no_hired_workers_desc') || 'Workers you hire will appear here'}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {/* Table header */}
                  <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-2.5 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <span>{t('worker') || 'Worker'}</span>
                    <span>{t('position') || 'Position'}</span>
                    <span>{t('job_start') || 'Start'}</span>
                    <span>{t('hired_since') || 'Hired'}</span>
                  </div>

                  {hiredWorkers.map((entry) => (
                    <div
                      key={entry.applicationId}
                      className="px-4 sm:px-5 py-3 sm:py-4 hover:bg-slate-50 transition-colors sm:grid sm:grid-cols-[1fr_1fr_auto_auto] sm:gap-4 sm:items-center"
                    >
                      {/* Worker info */}
                      <div className="flex items-center gap-3">
                        {entry.worker.profile_image_url ? (
                          <img
                            src={entry.worker.profile_image_url}
                            alt={entry.worker.full_name || ''}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <Link
                          href={`/worker/view-profile?id=${entry.worker.id}`}
                          className="text-sm font-medium text-slate-700 hover:text-slate-900 truncate"
                        >
                          {entry.worker.full_name || t('worker') || 'Worker'}
                        </Link>
                      </div>

                      {/* Position */}
                      <div className="mt-1 sm:mt-0">
                        <span className="sm:hidden text-xs text-slate-400">{t('position') || 'Position'}: </span>
                        <span className="text-sm text-slate-600">{entry.jobTitle}</span>
                      </div>

                      {/* Job start date */}
                      <div className="mt-1 sm:mt-0 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                        <span className="sm:hidden text-xs text-slate-400">{t('job_start') || 'Start'}: </span>
                        <span className="text-sm text-slate-500">
                          {new Date(entry.jobStartDate).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Hired date */}
                      <div className="mt-1 sm:mt-0 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                        <span className="sm:hidden text-xs text-slate-400">{t('hired_since') || 'Hired'}: </span>
                        <span className="text-sm text-slate-500">
                          {entry.hiredAt ? new Date(entry.hiredAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

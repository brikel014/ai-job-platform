'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import Navbar from '@/components/Navbar'
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getApplicationById } from '@/lib/db'
import { getSupabaseClient } from '@/lib/db/utils'
import type { Notification } from '@/lib/types'
import { 
  Bell, 
  CheckCircle, 
  Mail, 
  FileText, 
  XCircle, 
  Clock,
  ChevronRight,
  Inbox,
  CheckCheck
} from 'lucide-react'

type FilterStatus = 'all' | 'unread' | 'read'

/**
 * Extracts worker/employer name and job title from the raw DB notification message.
 * DB messages follow patterns like:
 *   "{name} applied for {job}"
 *   "{name} accepted your job offer for: {job}"
 *   "Your application for {job} has been accepted!"
 */
function parseNotificationVars(type: Notification['type'], rawMessage: string): { name: string; job: string } {
  let name = ''
  let job = ''

  if (type === 'application_received') {
    // "{name} applied for {job}"
    const m = rawMessage.match(/^(.+?) applied for (.+)$/)
    if (m) { name = m[1]; job = m[2] }
  } else if (type === 'application_accepted' && rawMessage.startsWith('Your application')) {
    // "Your application for {job} has been accepted!" (worker side)
    const m = rawMessage.match(/Your application for (.+?) has been accepted/)
    if (m) job = m[1]
  } else if (type === 'application_accepted') {
    // "{name} accepted your job offer for: {job}" (employer side)
    const m = rawMessage.match(/^(.+?) accepted your job offer for: (.+)$/)
    if (m) { name = m[1]; job = m[2] }
  } else if (type === 'application_confirmed') {
    // "{name} has confirmed the position for {job}"
    const m = rawMessage.match(/^(.+?) has confirmed the position for (.+)$/)
    if (m) { name = m[1]; job = m[2] }
  } else if (type === 'application_offered') {
    // "You have been offered the position: {job}"
    const m = rawMessage.match(/position[:\s]+(.+)$/)
    if (m) job = m[1]
  } else if (type === 'application_rejected') {
    // "Your application for {job} has been rejected." or "was not selected"
    const m = rawMessage.match(/Your application for (.+?)(?:\s+has been| was)/)
    if (m) job = m[1]
  } else if (type === 'application_hired') {
    const m = rawMessage.match(/hired for (.+)$/)
    if (m) job = m[1]
  } else if (type === 'offer_expired') {
    const m = rawMessage.match(/offer for (.+?) has expired/) || rawMessage.match(/offer for (.+)$/)
    if (m) job = m[1]
  } else if (type === 'job_offer') {
    const m = rawMessage.match(/offer for (.+)$/) || rawMessage.match(/position[:\s]+(.+)$/)
    if (m) job = m[1]
  } else if (type === 'job_offer_withdrawn') {
    const m = rawMessage.match(/offer for (.+?) has been withdrawn/) || rawMessage.match(/for (.+)$/)
    if (m) job = m[1]
  } else if (type === 'position_filled' || type === 'job_filled') {
    const m = rawMessage.match(/positions for (.+?) have been/) || rawMessage.match(/for (.+)$/)
    if (m) job = m[1]
  } else if (type === 'job_cancelled') {
    const m = rawMessage.match(/job (.+?) has been/) || rawMessage.match(/job (.+)$/)
    if (m) job = m[1]
  } else if (type === 'job_expired') {
    const m = rawMessage.match(/posting (.+?) has expired/) || rawMessage.match(/posting (.+)$/)
    if (m) job = m[1]
  }

  // Fallback: use the raw message as job if nothing parsed
  if (!job) job = rawMessage

  return { name, job }
}

export default function NotificationsPage() {
  const { user, role, loading: authLoading } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const supabase = getSupabaseClient()

  const loadNotifications = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    const notifs = await getNotifications(user.id)
    setNotifications(notifs)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    
    if (user) {
      loadNotifications()
    }
  }, [user, authLoading, loadNotifications])

  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!user) return

    // Subscribe to notification changes for this user
    const channel = supabase
      .channel(`notifications-page:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // Reload notifications when any change occurs
          await loadNotifications()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user, supabase, loadNotifications])

  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    await markNotificationAsRead(notificationId)
    await loadNotifications()
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return
    await markAllNotificationsAsRead(user.id)
    await loadNotifications()
  }

  const getNotificationLink = (notification: Notification): string | null => {
    switch (notification.type) {
      case 'job_offer':
        return '/worker/job-offers'
      case 'job_offer_withdrawn':
        return '/worker/job-offers'
      case 'application_received':
        return 'application_received'
      case 'application_accepted':
      case 'application_hired':
      case 'application_offered':
        return '/worker/applications'
      case 'application_rejected':
        return '/worker/applications'
      case 'application_confirmed':
      case 'offer_expired':
        return 'employer_application'
      default:
        return null
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id)
    }
    
    // For accepted/hired/offered applications, navigate to applications page with the application highlighted
    if (role === 'worker' && (notification.type === 'application_accepted' || notification.type === 'application_hired' || notification.type === 'application_offered')) {
      if (notification.related_id) {
        router.push(`/worker/applications?applicationId=${notification.related_id}`)
        return
      }
    }
    
    // Handle application_received - employer needs job_id lookup
    if (notification.type === 'application_received' && notification.related_id) {
      const application = await getApplicationById(notification.related_id)
      
      if (application) {
        router.push(`/employer/jobs/${application.job_id}/applications`)
      } else {
        router.push(`/employer/jobs/${notification.related_id}/applications`)
      }
      return
    }
    
    // Handle employer notifications that need application lookup (confirmed, expired)
    if ((notification.type === 'application_confirmed' || notification.type === 'offer_expired') && notification.related_id) {
      const application = await getApplicationById(notification.related_id)
      
      if (application) {
        router.push(`/employer/jobs/${application.job_id}/applications`)
      }
      return
    }
    
    const link = getNotificationLink(notification)
    if (link && link !== 'application_received' && link !== 'employer_application') {
      router.push(link)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    const iconConfig = {
      job_offer: { bg: 'bg-amber-100', icon: Mail, color: 'text-amber-600' },
      job_offer_withdrawn: { bg: 'bg-red-100', icon: XCircle, color: 'text-red-600' },
      application_received: { bg: 'bg-blue-100', icon: FileText, color: 'text-blue-600' },
      application_accepted: { bg: 'bg-green-100', icon: CheckCircle, color: 'text-green-600' },
      application_rejected: { bg: 'bg-red-100', icon: XCircle, color: 'text-red-600' },
      application_hired: { bg: 'bg-green-100', icon: CheckCircle, color: 'text-green-600' },
      application_offered: { bg: 'bg-blue-100', icon: Mail, color: 'text-blue-600' },
      application_confirmed: { bg: 'bg-green-100', icon: CheckCircle, color: 'text-green-600' },
      offer_expired: { bg: 'bg-slate-100', icon: Clock, color: 'text-slate-600' },
      position_filled: { bg: 'bg-slate-100', icon: Bell, color: 'text-slate-600' },
      job_cancelled: { bg: 'bg-red-100', icon: XCircle, color: 'text-red-600' },
      job_expired: { bg: 'bg-slate-100', icon: Clock, color: 'text-slate-600' },
      job_filled: { bg: 'bg-green-100', icon: CheckCircle, color: 'text-green-600' },
    }
    
    const config = iconConfig[type] || { bg: 'bg-slate-100', icon: Bell, color: 'text-slate-600' }
    const Icon = config.icon
    
    return (
      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>
    )
  }

  const getTimeText = (notification: Notification): string => {
    const date = new Date(notification.created_at)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) {
      return t('just_now')
    } else if (diffMins < 60) {
      return `${diffMins}m`
    } else if (diffHours < 24) {
      return `${diffHours}h`
    } else if (diffDays < 7) {
      return `${diffDays}d`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getNotificationTitle = (notif: Notification): string => {
    const titleKeyMap: Partial<Record<Notification['type'], string>> = {
      application_received: 'notif_title_application_received',
      application_confirmed: 'notif_title_application_confirmed',
      application_offered: 'notif_title_application_offered',
      application_rejected: 'notif_title_application_rejected',
      application_hired: 'notif_title_application_hired',
      offer_expired: 'notif_title_offer_expired',
      job_offer: 'notif_title_job_offer',
      job_offer_withdrawn: 'notif_title_job_offer_withdrawn',
      position_filled: 'notif_title_position_filled',
      job_cancelled: 'notif_title_job_cancelled',
      job_expired: 'notif_title_job_expired',
      job_filled: 'notif_title_job_filled',
    }
    // application_accepted covers both worker (accepted) and employer (offer accepted by worker)
    if (notif.type === 'application_accepted') {
      const isEmployerNotif = notif.message && !notif.message.startsWith('Your application')
      return t(isEmployerNotif ? 'notif_title_job_offer_accepted' : 'notif_title_application_accepted' as any)
    }
    const key = titleKeyMap[notif.type]
    return key ? t(key as any) : notif.title
  }

  const getNotificationMessage = (notif: Notification): string => {
    const msgKeyMap: Partial<Record<Notification['type'], string>> = {
      application_received: 'notif_msg_application_received',
      application_confirmed: 'notif_msg_application_confirmed',
      application_offered: 'notif_msg_application_offered',
      application_rejected: 'notif_msg_application_rejected',
      application_hired: 'notif_msg_application_hired',
      offer_expired: 'notif_msg_offer_expired',
      job_offer: 'notif_msg_job_offer',
      job_offer_withdrawn: 'notif_msg_job_offer_withdrawn',
      position_filled: 'notif_msg_position_filled',
      job_cancelled: 'notif_msg_job_cancelled',
      job_expired: 'notif_msg_job_expired',
      job_filled: 'notif_msg_job_filled',
    }
    // application_accepted: worker side vs employer side
    let msgKey: string | undefined
    if (notif.type === 'application_accepted') {
      const isEmployerNotif = notif.message && !notif.message.startsWith('Your application')
      msgKey = isEmployerNotif ? 'notif_msg_job_offer_accepted' : 'notif_msg_application_accepted'
    } else {
      msgKey = msgKeyMap[notif.type]
    }
    if (!msgKey) return notif.message

    const { name, job } = parseNotificationVars(notif.type, notif.message)
    return t(msgKey as any).replace('{name}', name).replace('{job}', job)
  }

  // Filter notifications based on selected status
  const filteredNotifications = notifications.filter(notif => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'unread') return !notif.read
    if (filterStatus === 'read') return notif.read
    return true
  })

  // Count notifications by status
  const counts = {
    all: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    read: notifications.filter(n => n.read).length,
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
    <div className="min-h-screen bg-[#f8fafc]" data-testid="notifications-page">
      <Navbar />
      
      {/* Desktop Layout */}
      <div className="hidden lg:block h-[calc(100vh-64px)]">
        <div className="flex h-full">
          {/* Filters Sidebar */}
          <div className="flex-shrink-0 w-72 xl:w-80 bg-slate-100 border-r border-slate-200 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-auto-hide">
              {/* Sidebar Header */}
              <div className="sticky top-0 bg-slate-100 z-10 px-5 py-4 border-b border-slate-200/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{t('notifications')}</h2>
                    <p className="text-xs text-slate-500">{t('stay_updated')}</p>
                  </div>
                </div>
              </div>

              {/* Stats/Filter Buttons */}
              <div className="p-4 space-y-2">
                {[
                  { key: 'all', icon: Bell, label: t('all') },
                  { key: 'unread', icon: Clock, label: t('unread') },
                  { key: 'read', icon: CheckCheck, label: t('read_status') },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(key as FilterStatus)}
                    className={`w-full group bg-white rounded-xl border p-3 text-left transition-all duration-200 ${
                      filterStatus === key
                        ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-lg'
                        : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        filterStatus === key
                          ? 'bg-blue-600'
                          : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}>
                        <Icon className={`w-4 h-4 transition-colors ${
                          filterStatus === key
                            ? 'text-white'
                            : 'text-slate-500'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 font-medium">{label}</p>
                        <p className="text-xl font-bold text-slate-800">{counts[key as keyof typeof counts]}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Mark All as Read Button */}
              {counts.unread > 0 && (
                <div className="px-4 pb-4">
                  <button
                    onClick={handleMarkAllAsRead}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                    data-testid="mark-all-as-read"
                  >
                    <CheckCheck className="w-4 h-4" />
                    {t('mark_all_as_read')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="h-full overflow-y-auto bg-white">
              {/* Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      {filterStatus === 'all' ? t('all_notifications') || t('notifications') : 
                       filterStatus === 'unread' ? t('unread') : t('read_status')}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      <span className="font-semibold text-blue-600">{filteredNotifications.length}</span> {filteredNotifications.length === 1 ? 'notification' : 'notifications'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notification Cards */}
              <div className="p-6">
                <div className="flex flex-col gap-3">
                  {filteredNotifications.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Inbox className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        {filterStatus === 'all' ? t('no_notifications') : 
                         filterStatus === 'unread' ? t('no_unread_notifications') || 'No unread notifications' : 
                         t('no_read_notifications') || 'No read notifications'}
                      </h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        {t('no_notifications_description')}
                      </p>
                    </div>
                  ) : (
                    filteredNotifications.map((notif, index) => {
                      const link = getNotificationLink(notif)
                      const isClickable = !!link

                      return (
                        <div 
                          key={notif.id}
                          data-testid="notification-card"
                          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div 
                            onClick={() => isClickable && handleNotificationClick(notif)}
                            className={`group bg-white rounded-2xl border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${
                              !notif.read 
                                ? 'border-l-4 border-l-blue-500 border-t-slate-200 border-r-slate-200 border-b-slate-200' 
                                : 'border-slate-200 hover:border-blue-300'
                            } ${isClickable ? 'cursor-pointer' : ''}`}
                          >
                            <div className="p-5">
                              {/* Header */}
                              <div className="flex items-start gap-4">
                                {getNotificationIcon(notif.type)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h2 
                                      data-testid="notification-title"
                                      className={`font-semibold text-slate-900 leading-tight line-clamp-2 ${isClickable ? 'group-hover:text-blue-600 transition-colors' : ''}`}
                                    >
                                      {notif.title}
                                    </h2>
                                    <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                                      <Clock className="w-3 h-3" />
                                      {getTimeText(notif)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                                    {notif.message}
                                  </p>
                                  
                                  {/* Actions row */}
                                  <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-2">
                                      {!notif.read && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs font-medium">
                                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                          {t('new')}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {!notif.read && (
                                        <button
                                          onClick={(e) => handleMarkAsRead(e, notif.id)}
                                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                          data-testid="mark-as-read"
                                        >
                                          <CheckCircle className="w-3 h-3" />
                                          {t('mark_as_read')}
                                        </button>
                                      )}
                                      {isClickable && (
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden px-4 py-5 pb-24">
        {/* Mobile Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900">{t('notifications')}</h1>
        </div>

        {/* Mobile Stats/Filter Buttons */}
        <div className="space-y-2 mb-6">
          {[
            { key: 'all', icon: Bell, label: t('all') },
            { key: 'unread', icon: Clock, label: t('unread') },
            { key: 'read', icon: CheckCheck, label: t('read_status') },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key as FilterStatus)}
              className={`w-full group bg-white rounded-xl border p-3 text-left transition-all duration-200 ${
                filterStatus === key
                  ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-lg'
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  filterStatus === key
                    ? 'bg-blue-600'
                    : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                  <Icon className={`w-4 h-4 transition-colors ${
                    filterStatus === key
                      ? 'text-white'
                      : 'text-slate-500'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">{label}</p>
                  <p className="text-xl font-bold text-slate-800">{counts[key as keyof typeof counts]}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Mark All as Read Button - Mobile */}
        {counts.unread > 0 && (
          <div className="mb-6">
            <button
              onClick={handleMarkAllAsRead}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
              data-testid="mark-all-as-read-mobile"
            >
              <CheckCheck className="w-4 h-4" />
              {t('mark_all_as_read')}
            </button>
          </div>
        )}

        {/* Mobile Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {filterStatus === 'all' ? t('no_notifications') : 
                 filterStatus === 'unread' ? t('no_unread_notifications') || 'No unread notifications' : 
                 t('no_read_notifications') || 'No read notifications'}
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                {t('no_notifications_description')}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif, index) => {
              const link = getNotificationLink(notif)
              const isClickable = !!link

              return (
                <div 
                  key={notif.id}
                  data-testid="notification-card"
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div 
                    onClick={() => isClickable && handleNotificationClick(notif)}
                    className={`group bg-white rounded-2xl border hover:shadow-lg transition-all duration-200 ${
                      !notif.read 
                        ? 'border-l-4 border-l-blue-500 border-t-slate-200 border-r-slate-200 border-b-slate-200' 
                        : 'border-slate-200 hover:border-blue-300'
                    } ${isClickable ? 'cursor-pointer' : ''}`}
                  >
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notif.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h2 
                              data-testid="notification-title"
                              className={`font-semibold text-slate-900 text-sm leading-tight line-clamp-2 ${isClickable ? 'group-hover:text-blue-600 transition-colors' : ''}`}
                            >
                              {getNotificationTitle(notif)}
                            </h2>
                            <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              {getTimeText(notif)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                            {getNotificationMessage(notif)}
                          </p>
                          
                          {/* Actions row */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              {!notif.read && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-medium">
                                  <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                                  {t('new')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {!notif.read && (
                                <button
                                  onClick={(e) => handleMarkAsRead(e, notif.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                  data-testid="mark-as-read"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  {t('mark_as_read')}
                                </button>
                              )}
                              {isClickable && (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

    </div>
  )
}

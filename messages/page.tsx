'use client'

import { useEffect, useState, type ReactElement, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import Navbar from '@/components/Navbar'
import { getConversations, getJobPosting, getEmployerProfile } from '@/lib/db'
import { getConversation, getOtherParticipant } from '@/lib/db/conversations'
import { getUnreadCountsPerConversation, markMessagesAsRead } from '@/lib/db/messages'
import { logError } from '@/lib/logger'
import { ChatWindow } from '@/components/messages/ChatWindow'
import { getSupabaseClient } from '@/lib/db/utils'
import type { Conversation, EmployerProfile } from '@/lib/types'
import type { TranslationKey } from '@/lib/i18n'
import { EmployerSidebar } from '@/components/employer/EmployerSidebar'
import { EmployerDataProvider } from '@/lib/contexts/EmployerDataContext'
import { useNotifications } from '@/components/navbar/hooks/useNotifications'
import { NotificationDropdown } from '@/components/navbar/NotificationDropdown'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MessageCircle, 
  Lock, 
  Briefcase, 
  Search,
  Sparkles,
  Archive,
  Inbox,
  Bell,
  Building2,
  Menu
} from 'lucide-react'

// Employer Layout Wrapper - defined outside MessagesPageContent to prevent remounting on state changes
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
          {children}
        </main>
      </div>
    </div>
    </EmployerDataProvider>
  )
}

function MessagesPageContent() {
  const { user, loading: authLoading, role } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map())
  
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    
    if (user) {
      loadConversations()
    }
  }, [user, authLoading])
  
  // Load employer profile data for sidebar display
  useEffect(() => {
    const loadEmployerProfileForSidebar = async () => {
      if (!user || role !== 'employer') return
      const empProfile = await getEmployerProfile(user.id)
      setEmployerProfileData(empProfile)
    }
    loadEmployerProfileForSidebar()
  }, [user, role])

  // Set up Realtime subscriptions for conversations and messages
  useEffect(() => {
    if (!user) return

    const supabase = getSupabaseClient()

    // Subscribe to conversation updates (last_message_at, status changes)
    const conversationsSubscription = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        async (payload) => {
          const updatedConversation = payload.new as Conversation
          
          // Check if this conversation belongs to the current user
          const isParticipant = 
            (role === 'worker' && updatedConversation.worker_id === user.id) ||
            (role === 'employer' && updatedConversation.employer_id === user.id)
          
          if (isParticipant) {
            // Update the conversation in the list
            setConversations((prev) => {
              const index = prev.findIndex(c => c.id === updatedConversation.id)
              if (index >= 0) {
                // Update existing conversation
                const updated = [...prev]
                updated[index] = updatedConversation
                // Re-sort by last_message_at
                return updated.sort((a, b) => {
                  const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
                  const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
                  return bTime - aTime
                })
              }
              return prev
            })

            // Update selected conversation if it's the one that changed
            if (selectedConversation?.id === updatedConversation.id) {
              setSelectedConversation(updatedConversation)
            }

            // Only reload unread counts if status changed (not just last_message_at)
            // Unread counts for new messages are handled by the messages subscription
            if (payload.old && (payload.old as Conversation).status !== updatedConversation.status) {
              getUnreadCountsPerConversation().then(counts => {
                setUnreadCounts(counts)
              }).catch((err) => logError('MessagesPage', err))
            }
          }
        }
      )
      .subscribe()

    // Subscribe to new conversations (INSERT events)
    const newConversationsSubscription = supabase
      .channel('conversations-inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        async (payload) => {
          const newConversation = payload.new as Conversation
          
          // Check if this conversation belongs to the current user
          const isParticipant = 
            (role === 'worker' && newConversation.worker_id === user.id) ||
            (role === 'employer' && newConversation.employer_id === user.id)
          
          if (isParticipant) {
            // Reload conversations to include the new one
            loadConversations()
          }
        }
      )
      .subscribe()

    // Subscribe to message read status changes to update unread counts
    const messagesSubscription = supabase
      .channel('messages-read-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: 'read=eq.true',
        },
        async () => {
          // Reload unread counts when messages are marked as read
          getUnreadCountsPerConversation().then(counts => {
            setUnreadCounts(counts)
          }).catch((err) => logError('MessagesPage', err))
        }
      )
      .subscribe()

    // Subscribe to new messages to update unread counts
    const newMessagesSubscription = supabase
      .channel('messages-inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as any
          
          // Only update unread counts if the message is not from the current user
          // (messages from current user are already handled optimistically in ChatWindow)
          if (newMessage.sender_user_id !== user.id) {
            // Reload unread counts when new messages arrive (that aren't from current user)
            getUnreadCountsPerConversation().then(counts => {
              setUnreadCounts(counts)
            }).catch((err) => logError('MessagesPage', err))
          }
        }
      )
      .subscribe()

    return () => {
      conversationsSubscription.unsubscribe()
      newConversationsSubscription.unsubscribe()
      messagesSubscription.unsubscribe()
      newMessagesSubscription.unsubscribe()
    }
  }, [user, role, selectedConversation])

  // Handle conversationId query parameter
  useEffect(() => {
    const conversationId = searchParams?.get('conversationId')
    if (conversationId && !loading && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === conversationId)
      if (conversation) {
        setSelectedConversation(conversation)
        setShowMobileChat(true)
        // Remove query parameter from URL
        router.replace('/messages', { scroll: false })
      } else {
        // Try to load the conversation directly if not in the list
        getConversation(conversationId).then(conv => {
          if (conv) {
            setSelectedConversation(conv)
            setShowMobileChat(true)
            // Reload conversations to include this one
            loadConversations()
            router.replace('/messages', { scroll: false })
          }
        })
      }
    }
  }, [searchParams, conversations, loading, router])

  const loadConversations = async () => {
    if (!user) return
    
    setLoading(true)
    const [convos, counts] = await Promise.all([
      getConversations(),
      getUnreadCountsPerConversation()
    ])
    setConversations(convos)
    setUnreadCounts(counts)
    setLoading(false)
  }

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setShowMobileChat(true)
    
    // Mark messages as read and clear unread count for this conversation
    if (unreadCounts.get(conversation.id)) {
      await markMessagesAsRead(conversation.id)
      setUnreadCounts(prev => {
        const newCounts = new Map(prev)
        newCounts.delete(conversation.id)
        return newCounts
      })
    }
  }

  const handleCloseChat = () => {
    setShowMobileChat(false)
    // Delay clearing selection for smooth animation
    setTimeout(() => {
      if (window.innerWidth < 1024) {
        setSelectedConversation(null)
      }
    }, 300)
  }

  const handleConversationUpdated = async () => {
    // Only reload conversations when status changes (offer/application accept/decline)
    // Regular message updates are handled via Realtime subscriptions
    if (!user) return
    
    const [convos, counts] = await Promise.all([
      getConversations(),
      getUnreadCountsPerConversation()
    ])
    setConversations(convos)
    setUnreadCounts(counts)
    
    // If a conversation was selected, update it with the new data from the reloaded list
    if (selectedConversation) {
      const updated = convos.find(c => c.id === selectedConversation.id)
      if (updated) {
        setSelectedConversation(updated)
      }
    }
  }

  const getStatusIcon = (status: Conversation['status']) => {
    switch (status) {
      case 'locked':
        return <Lock className="w-3 h-3" />
      default:
        return <MessageCircle className="w-3 h-3" />
    }
  }

  const getStatusText = (status: Conversation['status']) => {
    switch (status) {
      case 'locked':
        return t('waiting_for_acceptance')
      case 'active':
        return t('active')
      case 'declined':
        return t('declined')
      case 'closed':
        return t('withdrawn')
      default:
        return status
    }
  }

  // Filter conversations based on active tab
  const filteredConversations = conversations.filter(conv => {
    if (activeTab === 'active') {
      // Active includes: locked (pending) and active conversations
      return conv.status === 'locked' || conv.status === 'active'
    } else {
      // Archived includes: declined and closed (withdrawn) conversations
      return conv.status === 'declined' || conv.status === 'closed'
    }
  })

  // Count for badges
  const activeCount = conversations.filter(c => c.status === 'locked' || c.status === 'active').length
  const archivedCount = conversations.filter(c => c.status === 'declined' || c.status === 'closed').length
  
  // Total unread count across all conversations
  const totalUnread = Array.from(unreadCounts.values()).reduce((sum, count) => sum + count, 0)

  // Messages content component - shared between layouts
  const messagesContent = (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Conversations Sidebar */}
      <div className={`
        w-full lg:w-[360px] xl:w-[400px] flex-shrink-0
        bg-white lg:border-r border-slate-200
        flex flex-col
        ${showMobileChat ? 'hidden lg:flex' : 'flex'}
      `}>
        {/* Header */}
        <div className="p-4 lg:p-5 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl lg:text-2xl font-semibold text-slate-800 tracking-tight">{t('messages')}</h1>
                {totalUnread > 0 && (
                  <span 
                    data-testid="total-unread-badge"
                    className="px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-full bg-slate-800 text-white text-base sm:text-sm font-medium"
                  >
                    {totalUnread}
                  </span>
                )}
              </div>
              <p className="text-base sm:text-sm text-slate-500 mt-1">
                {filteredConversations.length} {filteredConversations.length === 1 ? t('conversation') : t('conversations')}
              </p>
            </div>
            <div className="relative">
              <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                <MessageCircle className="w-6 h-6 sm:w-5 sm:h-5 text-slate-400" />
              </div>
              {totalUnread > 0 && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] sm:min-w-[18px] sm:h-[18px] px-1 rounded-full bg-slate-800 flex items-center justify-center">
                  <span className="text-xs sm:text-[10px] font-bold text-white">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Active/Archived Tabs */}
          <div className="flex gap-2 sm:gap-1.5 mb-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`
                flex items-center gap-2 sm:gap-1.5 px-4 py-3 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-lg text-base sm:text-sm font-medium transition-all duration-200
                ${activeTab === 'active'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }
              `}
            >
              <Inbox className="w-5 h-5 sm:w-4 sm:h-4" />
              <span>{t('active')}</span>
              {activeCount > 0 && (
                <span className={`
                  px-2 py-0.5 sm:px-1.5 rounded text-sm sm:text-xs font-semibold min-w-[24px] sm:min-w-[20px] text-center
                  ${activeTab === 'active' ? 'bg-white/15 text-white/90' : 'bg-slate-100 text-slate-500'}
                `}>
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`
                flex items-center gap-2 sm:gap-1.5 px-4 py-3 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-lg text-base sm:text-sm font-medium transition-all duration-200
                ${activeTab === 'archived'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }
              `}
            >
              <Archive className="w-5 h-5 sm:w-4 sm:h-4" />
              <span>{t('archived')}</span>
              {archivedCount > 0 && (
                <span className={`
                  px-2 py-0.5 sm:px-1.5 rounded text-sm sm:text-xs font-semibold min-w-[24px] sm:min-w-[20px] text-center
                  ${activeTab === 'archived' ? 'bg-white/15 text-white/90' : 'bg-slate-100 text-slate-500'}
                `}>
                  {archivedCount}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 sm:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_messages')}
              className="w-full pl-12 sm:pl-10 pr-4 py-3 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg text-base sm:text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <EmptyTabState t={t} tab={activeTab} />
          ) : (
            <div className="py-2">
              {filteredConversations.map((conversation, index) => (
                <ConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  role={role}
                  isSelected={selectedConversation?.id === conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  getStatusIcon={getStatusIcon}
                  getStatusText={getStatusText}
                  t={t}
                  index={index}
                  unreadCount={unreadCounts.get(conversation.id) || 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`
        flex-1 flex flex-col bg-white
        ${showMobileChat ? 'fixed top-16 left-0 right-0 bottom-0 z-50 lg:relative lg:top-auto lg:z-auto' : 'hidden lg:flex'}
      `}>
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            onClose={handleCloseChat}
            showBackButton={showMobileChat}
            onConversationUpdated={handleConversationUpdated}
          />
        ) : (
          <EmptyChatState t={t} />
        )}
      </div>
    </div>
  )

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
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500">{t('loading') || 'Loading messages...'}</span>
          </div>
        </div>
      </div>
    )
  }

  // Render with appropriate layout based on user role
  if (role === 'employer') {
    return (
      <EmployerLayoutWrapper {...employerLayoutProps}>
        <div className="h-[calc(100vh-71px)]" data-testid="messages-page">
          {messagesContent}
        </div>
      </EmployerLayoutWrapper>
    )
  }

  // Default: Worker view with regular Navbar
  return (
    <div className="min-h-screen bg-slate-50" data-testid="messages-page">
      <Navbar />
      
      {/* Main Container - Full height minus navbar */}
      <div className="h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)]">
        {messagesContent}
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500">Loading messages...</span>          </div>
        </div>
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  )
}

// Empty state for no conversations
function EmptyState({ t }: { t: (key: TranslationKey) => string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-5">
        <MessageCircle className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-xl font-medium text-slate-700 mb-2">
        {t('no_messages')}
      </h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
        {t('messages_will_appear_here')}
      </p>
    </div>
  )
}

// Empty state for tabs (active/archived)
function EmptyTabState({ t, tab }: { t: (key: TranslationKey) => string; tab: 'active' | 'archived' }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
        {tab === 'active' ? (
          <Inbox className="w-6 h-6 text-slate-400" />
        ) : (
          <Archive className="w-6 h-6 text-slate-400" />
        )}
      </div>
      <h3 className="text-lg font-medium text-slate-700 mb-1.5">
        {tab === 'active' ? t('no_active_conversations') : t('no_archived_conversations')}
      </h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
        {tab === 'active' 
          ? t('active_conversations_desc')
          : t('archived_conversations_desc')
        }
      </p>
    </div>
  )
}

// Empty state for chat panel when no conversation selected
function EmptyChatState({ t }: { t: (key: TranslationKey) => string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
          <MessageCircle className="w-9 h-9 text-slate-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-slate-500" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-slate-700 mb-2">
        {t('select_conversation')}
      </h3>
      <p className="text-sm text-slate-500 max-w-sm text-center leading-relaxed">
        {t('select_conversation_desc')}
      </p>
    </div>
  )
}

interface ConversationCardProps {
  conversation: Conversation
  role: 'worker' | 'employer' | null
  isSelected: boolean
  onClick: () => void
  getStatusIcon: (status: Conversation['status']) => ReactElement
  getStatusText: (status: Conversation['status']) => string
  t: (key: TranslationKey) => string
  index: number
  unreadCount: number
}

function ConversationCard({ 
  conversation, 
  role, 
  isSelected, 
  onClick,
  getStatusIcon,
  getStatusText,
  t,
  index,
  unreadCount
}: ConversationCardProps) {
  const hasUnread = unreadCount > 0
  const [jobTitle, setJobTitle] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [otherParticipant, setOtherParticipant] = useState<string>('')
  const [otherParticipantImageUrl, setOtherParticipantImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDirectConversation, setIsDirectConversation] = useState(false)

  useEffect(() => {
    const loadDetails = async () => {
      // Check if this is a direct conversation (no job context)
      const isDirect = !conversation.job_id && !conversation.job_offer_id && !conversation.job_application_id
      setIsDirectConversation(isDirect)
      
      // Only fetch job if there's a job_id
      const [job, participant] = await Promise.all([
        conversation.job_id ? getJobPosting(conversation.job_id) : null,
        getOtherParticipant(conversation)
      ])
      
      if (job) {
        setJobTitle(job.title)
        setCompanyName(job.company_name || '')
      } else if (isDirect) {
        setJobTitle(t('direct_message'))
      }
      if (participant) {
        setOtherParticipant(participant.name)
        setOtherParticipantImageUrl(participant.profile_image_url || null)
      }
      setLoading(false)
    }
    loadDetails()
  }, [conversation, t])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('time_now')
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const initial = otherParticipant ? otherParticipant.charAt(0).toUpperCase() : '?'

  return (
    <div
      onClick={onClick}
      className={`
        group px-4 py-4 sm:px-3 sm:py-3 mx-2 rounded-xl cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'bg-slate-100' 
          : hasUnread
            ? 'bg-slate-50 hover:bg-slate-100'
            : 'hover:bg-slate-50'
        }
      `}
      style={{ animationDelay: `${index * 50}ms` }}
      data-testid={`conversation-card-${conversation.id}`}
    >
      <div className="flex items-start gap-4 sm:gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {loading ? (
            <div className="w-14 h-14 sm:w-11 sm:h-11 rounded-xl bg-slate-200 flex items-center justify-center">
              <div className="w-5 h-5 sm:w-4 sm:h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
            </div>
          ) : otherParticipantImageUrl ? (
            <div className="w-14 h-14 sm:w-11 sm:h-11 rounded-xl overflow-hidden ring-2 ring-slate-100">
              <img
                src={otherParticipantImageUrl}
                alt={otherParticipant}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 sm:w-11 sm:h-11 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center font-semibold text-lg sm:text-base transition-transform">
              {initial}
            </div>
          )}
          {/* Unread count badge - positioned on avatar */}
          {hasUnread && (
            <div 
              data-testid={`unread-badge-${conversation.id}`}
              className="absolute -top-1 -right-1 min-w-[22px] h-[22px] sm:min-w-[18px] sm:h-[18px] px-1 rounded-full bg-slate-800 flex items-center justify-center"
            >
              <span className="text-xs sm:text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </div>
          )}
          {/* Status indicator - only show if no unread badge */}
          {!hasUnread && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 border-white flex items-center justify-center text-xs sm:text-[10px] bg-slate-100 text-slate-500">
              {getStatusIcon(conversation.status)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1 sm:mb-0.5">
            <h3 className={`
              truncate text-lg sm:text-sm
              ${hasUnread ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}
            `}>
              {loading ? (
                <span className="inline-block w-28 h-4 sm:h-3.5 bg-slate-200 rounded animate-pulse" />
              ) : (
                otherParticipant || t('unknown_participant')
              )}
            </h3>
            <div className="flex items-center gap-2 sm:gap-1.5 flex-shrink-0">
              {hasUnread && (
                <span className="w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full bg-slate-700" />
              )}
              <span className={`text-sm sm:text-xs ${hasUnread ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                {formatDate(conversation.last_message_at)}
              </span>
            </div>
          </div>
          
          {/* Job info or Direct Message indicator */}
          <div className="flex items-center gap-2 sm:gap-1.5 mb-2 sm:mb-1.5">
            {isDirectConversation ? (
              <MessageCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-teal-500 flex-shrink-0" />
            ) : (
              <Briefcase className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 flex-shrink-0" />
            )}
            <span className={`text-base sm:text-sm truncate ${isDirectConversation ? 'text-teal-600' : 'text-slate-500'}`}>
              {loading ? (
                <span className="inline-block w-20 h-3 sm:h-2.5 bg-slate-100 rounded animate-pulse" />
              ) : (
                jobTitle
              )}
            </span>
          </div>

          {/* Status badge - hide for active conversations */}
          {conversation.status !== 'active' && (
            <div className="inline-flex items-center gap-1.5 sm:gap-1 px-3 py-1 sm:px-2 sm:py-0.5 rounded-lg sm:rounded text-sm sm:text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200">
              {getStatusIcon(conversation.status)}
              <span>{getStatusText(conversation.status)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

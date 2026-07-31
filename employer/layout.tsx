'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { EmployerSidebar } from '@/components/employer/EmployerSidebar'
import { EmployerDataProvider, useEmployerData } from '@/lib/contexts/EmployerDataContext'
import { NotificationDropdown } from '@/components/navbar/NotificationDropdown'
import { Bell, Building2, Menu, MessageCircle } from 'lucide-react'

function EmployerLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)

  const {
    profile,
    profileLoading,
    notifications,
    notificationCount,
    notificationsLoading,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    unreadMessageCount,
  } = useEmployerData()

  // Treat the user as an employer if either user_metadata says so OR they
  // have an employer profile in the database. The DB fallback covers legacy
  // accounts whose user_metadata.role was never set (or where backfilling it
  // at login time failed) — without it, those users would be stuck on the
  // loading spinner below forever.
  const isEmployer = role === 'employer' || (role !== 'worker' && profile !== null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    // Redirect workers - they cannot access employer pages (except viewing public profiles)
    if (!authLoading && user && role === 'worker' && pathname !== '/employer/view-profile') {
      router.push('/worker/jobs')
      return
    }

    // Authenticated, no role in metadata, and the profile fetch finished
    // with no employer profile — they don't belong here. Send them home.
    if (
      !authLoading &&
      user &&
      role === null &&
      !profileLoading &&
      profile === null &&
      pathname !== '/employer/view-profile'
    ) {
      router.push('/')
      return
    }
  }, [user, role, authLoading, profile, profileLoading, router, pathname])

  const isPublicViewProfile = pathname === '/employer/view-profile'

  // Show loading state while checking auth. When role is missing from
  // user_metadata we also need to wait for the profile fetch to settle
  // before we can decide whether this user is allowed in.
  const stillResolvingRole = role === null && profileLoading
  if (
    !mounted ||
    authLoading ||
    !user ||
    stillResolvingRole ||
    (!isEmployer && !isPublicViewProfile)
  ) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-sm font-medium text-slate-500">Loading...</span>
        </div>
      </div>
    )
  }

  // Workers viewing public employer profile get a simple layout without employer chrome
  if (isPublicViewProfile && !isEmployer) {
    return (
      <div className="min-h-screen bg-slate-50">
        {children}
      </div>
    )
  }

  return (
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
          <Link href="/employer/overview" className="flex items-center">
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

        {/* Right: Notifications + Messages (mobile) + Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationDropdownOpen(prev => !prev)}
              className={`relative p-3 rounded-xl transition-colors ${
                notificationCount > 0
                  ? 'bg-red-50 text-red-500 hover:bg-red-100'
                  : 'text-slate-500 hover:bg-slate-100'
              } ${isNotificationDropdownOpen ? 'bg-slate-100' : ''}`}
              aria-expanded={isNotificationDropdownOpen}
              aria-haspopup="true"
            >
              <Bell className="w-6 h-6" strokeWidth={1.5} />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
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

          {/* Messages Icon - Mobile Only */}
          <Link
            href="/messages"
            className="lg:hidden relative p-3 rounded-xl transition-colors text-slate-500 hover:bg-slate-100"
            aria-label="Messages"
          >
            <MessageCircle className="w-6 h-6" strokeWidth={1.5} />
            {unreadMessageCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-blue-500 text-white rounded-full px-1">
                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
              </span>
            )}
          </Link>

          {/* Profile Picture */}
          <Link
            href="/employer/view-profile"
            className="flex items-center p-1"
          >
            {profile?.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={profile.company_name || ''}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 hover:ring-blue-200 transition-all"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center ring-2 ring-slate-100 hover:ring-blue-200 transition-all">
                <Building2 className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
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
        <main className="flex-1 min-w-0 overflow-x-hidden min-h-[calc(100vh-71px)]">
          {/* Page Content */}
          <div className="pb-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function EmployerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <EmployerDataProvider>
      <EmployerLayoutInner>{children}</EmployerLayoutInner>
    </EmployerDataProvider>
  )
}

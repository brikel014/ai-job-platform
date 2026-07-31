'use client'

/**
 * Privacy and Security Settings Page
 * 
 * A comprehensive settings page for managing account security:
 * - Change password
 * - Change email
 * - View connected accounts (OAuth)
 * - Active sessions info
 * - Download your data
 * - Delete account
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/useLanguage'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { ScrollReveal } from '@/components/animations/ScrollReveal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { 
  Shield, 
  Lock, 
  Mail, 
  Trash2, 
  Download, 
  Key,
  CheckCircle,
  AlertTriangle,
  X,
  Globe,
  Loader2,
  ChevronDown,
  User,
  Smartphone,
  Clock
} from 'lucide-react'

type SectionType = 'password' | 'email' | 'delete' | null

export default function PrivacySecurityPage() {
  const { t } = useLanguage()
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // UI State
  const [activeSection, setActiveSection] = useState<SectionType>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Change Email State
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  // Delete Account State
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Data Export State
  const [exportLoading, setExportLoading] = useState(false)

  // User info
  const hasPasswordAuth = user?.identities?.some(i => i.provider === 'email') ?? false
  const connectedProviders = user?.identities?.map(i => i.provider) ?? []
  const userEmail = user?.email ?? ''
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : null

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const clearMessages = () => {
    setSuccessMessage('')
    setErrorMessage('')
  }

  const resetForms = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setNewEmail('')
    setEmailPassword('')
    setDeletePassword('')
    setDeleteConfirmText('')
    setActiveSection(null)
  }

  // =========================================================================
  // CHANGE PASSWORD
  // =========================================================================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    if (!newPassword || newPassword.length < 8) {
      setErrorMessage(t('password_min_length') || 'Password must be at least 8 characters')
      return
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setErrorMessage(t('password_strength') || 'Password must contain both letters and numbers')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage(t('passwords_dont_match') || 'Passwords do not match')
      return
    }

    setPasswordLoading(true)

    try {
      // Verify current password first
      if (hasPasswordAuth && userEmail) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword,
        })
        if (signInError) {
          setErrorMessage(t('incorrect_password') || 'Current password is incorrect')
          setPasswordLoading(false)
          return
        }
      }

      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        setErrorMessage(error.message || t('password_update_failed') || 'Failed to update password')
      } else {
        setSuccessMessage(t('password_updated_success') || 'Password updated successfully!')
        resetForms()
      }
    } catch (err) {
      setErrorMessage(t('unexpected_error') || 'An unexpected error occurred')
    }

    setPasswordLoading(false)
  }

  // =========================================================================
  // CHANGE EMAIL
  // =========================================================================
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    if (!newEmail || !newEmail.includes('@')) {
      setErrorMessage(t('invalid_email') || 'Please enter a valid email address')
      return
    }

    if (newEmail === userEmail) {
      setErrorMessage(t('email_same_as_current') || 'New email is the same as current email')
      return
    }

    setEmailLoading(true)

    try {
      // Verify password first
      if (hasPasswordAuth && userEmail) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: emailPassword,
        })
        if (signInError) {
          setErrorMessage(t('incorrect_password') || 'Password is incorrect')
          setEmailLoading(false)
          return
        }
      }

      // Update email
      const { error } = await supabase.auth.updateUser({ 
        email: newEmail 
      })

      if (error) {
        setErrorMessage(error.message || t('email_update_failed') || 'Failed to update email')
      } else {
        setSuccessMessage(
          t('email_verification_sent') || 
          'A verification email has been sent to your new email address. Please check your inbox.'
        )
        resetForms()
      }
    } catch (err) {
      setErrorMessage(t('unexpected_error') || 'An unexpected error occurred')
    }

    setEmailLoading(false)
  }

  // =========================================================================
  // DELETE ACCOUNT
  // =========================================================================
  const handleDeleteAccount = async () => {
    clearMessages()

    if (deleteConfirmText !== 'DELETE') {
      setErrorMessage(t('type_delete_to_confirm') || 'Please type DELETE to confirm')
      return
    }

    setDeleteLoading(true)

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deletePassword,
          confirmText: deleteConfirmText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || t('account_deletion_failed') || 'Failed to delete account')
        setDeleteLoading(false)
        return
      }

      // Sign out and redirect
      await signOut()
      router.push('/')
    } catch (err) {
      setErrorMessage(t('unexpected_error') || 'An unexpected error occurred')
    }

    setDeleteLoading(false)
  }

  // =========================================================================
  // EXPORT DATA
  // =========================================================================
  const handleExportData = async () => {
    clearMessages()
    setExportLoading(true)

    try {
      // Fetch user's data from various tables
      const [
        workerProfileRes,
        employerProfileRes,
        applicationsRes,
        notificationsRes,
      ] = await Promise.all([
        supabase.from('worker_profiles').select('*').eq('id', user?.id).maybeSingle(),
        supabase.from('employer_profiles').select('*').eq('id', user?.id).maybeSingle(),
        supabase.from('job_applications').select('*').eq('worker_id', user?.id),
        supabase.from('notifications').select('*').eq('user_id', user?.id),
      ])

      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          id: user?.id,
          email: user?.email,
          phone: user?.phone,
          createdAt: user?.created_at,
          lastSignIn: user?.last_sign_in_at,
          role: user?.user_metadata?.role,
        },
        workerProfile: workerProfileRes.data,
        employerProfile: employerProfileRes.data,
        applications: applicationsRes.data || [],
        notifications: notificationsRes.data || [],
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccessMessage(t('data_exported_success') || 'Your data has been exported successfully!')
    } catch (err) {
      setErrorMessage(t('export_failed') || 'Failed to export data. Please try again.')
    }

    setExportLoading(false)
  }

  // =========================================================================
  // RENDER
  // =========================================================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fafbfc]">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] overflow-x-hidden">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 pb-8">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-200/30 via-blue-100/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-100/30 via-purple-50/20 to-transparent rounded-full blur-3xl" />
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgb(59, 130, 246) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
          <ScrollReveal variant="fade-up" delay={0}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
                <Shield className="w-4 h-4" />
                {t('privacy_and_security')}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                {t('account_security') || 'Account Security'}
              </h1>
              <p className="text-lg text-slate-600 max-w-xl mx-auto">
                {t('security_page_description') || 'Manage your account security settings and privacy preferences'}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Main Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 pb-24 md:pb-12">
        
        {/* Alerts */}
        {successMessage && (
          <ScrollReveal variant="fade-up" delay={0}>
            <div className="mb-6">
              <Alert type="success" message={successMessage} onClose={() => setSuccessMessage('')} />
            </div>
          </ScrollReveal>
        )}
        {errorMessage && (
          <ScrollReveal variant="fade-up" delay={0}>
            <div className="mb-6">
              <Alert type="error" message={errorMessage} onClose={() => setErrorMessage('')} />
            </div>
          </ScrollReveal>
        )}

        {/* Content Sections */}
        <div className="space-y-4">
          
          {/* Account Info Card */}
          <ScrollReveal variant="fade-up" delay={100}>
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">
                    {t('account_info') || 'Account Information'}
                  </h2>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-600 truncate">{userEmail || t('not_set') || 'Not set'}</span>
                    </div>
                    {user?.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <Smartphone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-600">{user.phone}</span>
                      </div>
                    )}
                    {lastSignIn && (
                      <div className="flex items-center gap-3 text-sm">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-500">{t('last_sign_in') || 'Last sign in'}: {lastSignIn}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Connected Accounts */}
          <ScrollReveal variant="fade-up" delay={150}>
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">
                    {t('connected_accounts') || 'Connected Accounts'}
                  </h2>
                  <div className="space-y-3">
                    {/* Email/Password */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                          <Key className="w-4 h-4 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {t('email_password') || 'Email & Password'}
                        </span>
                      </div>
                      {hasPasswordAuth ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {t('connected') || 'Connected'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">{t('not_connected') || 'Not connected'}</span>
                      )}
                    </div>
                    
                    {/* Google */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-slate-700">Google</span>
                      </div>
                      {connectedProviders.includes('google') ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {t('connected') || 'Connected'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">{t('not_connected') || 'Not connected'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Change Password */}
          <ScrollReveal variant="fade-up" delay={200}>
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  clearMessages()
                  setActiveSection(activeSection === 'password' ? null : 'password')
                }}
                className="w-full p-6 text-left flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">
                    {t('change_password') || 'Change Password'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {t('change_password_description') || 'Update your password to keep your account secure'}
                  </p>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${activeSection === 'password' ? 'rotate-180' : ''}`} />
              </button>

              {activeSection === 'password' && (
                <div className="px-6 pb-6 border-t border-slate-100">
                  <form onSubmit={handleChangePassword} className="pt-5 space-y-4">
                    {hasPasswordAuth && (
                      <Input
                        id="currentPassword"
                        type="password"
                        label={t('current_password') || 'Current Password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        data-testid="current-password-input"
                      />
                    )}
                    <Input
                      id="newPassword"
                      type="password"
                      label={t('new_password') || 'New Password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      helperText={t('password_helper') || 'Min 8 characters with letters and numbers'}
                      required
                      data-testid="new-password-input"
                    />
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      label={t('confirm_new_password') || 'Confirm New Password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      data-testid="confirm-new-password-input"
                    />
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          resetForms()
                          clearMessages()
                        }}
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        type="submit"
                        isLoading={passwordLoading}
                        data-testid="change-password-submit"
                      >
                        {t('update_password') || 'Update Password'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Change Email */}
          <ScrollReveal variant="fade-up" delay={250}>
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  clearMessages()
                  setActiveSection(activeSection === 'email' ? null : 'email')
                }}
                className="w-full p-6 text-left flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">
                    {t('change_email') || 'Change Email'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {t('change_email_description') || 'Update your email address'}
                  </p>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${activeSection === 'email' ? 'rotate-180' : ''}`} />
              </button>

              {activeSection === 'email' && (
                <div className="px-6 pb-6 border-t border-slate-100">
                  <form onSubmit={handleChangeEmail} className="pt-5 space-y-4">
                    <Input
                      id="newEmail"
                      type="email"
                      label={t('new_email') || 'New Email Address'}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="new@example.com"
                      required
                      data-testid="new-email-input"
                    />
                    {hasPasswordAuth && (
                      <Input
                        id="emailPassword"
                        type="password"
                        label={t('confirm_with_password') || 'Confirm with Password'}
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        required
                        data-testid="email-password-input"
                      />
                    )}
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          resetForms()
                          clearMessages()
                        }}
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        type="submit"
                        isLoading={emailLoading}
                        data-testid="change-email-submit"
                      >
                        {t('update_email') || 'Update Email'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Download Your Data */}
          <ScrollReveal variant="fade-up" delay={300}>
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-900 mb-1">
                    {t('download_your_data') || 'Download Your Data'}
                  </h2>
                  <p className="text-sm text-slate-500 mb-4">
                    {t('download_data_description') || 'Get a copy of all your personal data stored in our system'}
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleExportData}
                    isLoading={exportLoading}
                    data-testid="export-data-button"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('export_data') || 'Export Data'}
                  </Button>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Delete Account */}
          <ScrollReveal variant="fade-up" delay={350}>
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-200/60 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-red-900 mb-1">
                    {t('delete_account')}
                  </h2>
                  <p className="text-sm text-red-700/80 mb-4">
                    {t('delete_account_warning') || 'Permanently delete your account and all associated data. This action cannot be undone.'}
                  </p>
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteModal(true)}
                    data-testid="delete-account-button"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('delete_account')}
                  </Button>
                </div>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {t('delete_account_confirm_title') || 'Delete Account?'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletePassword('')
                    setDeleteConfirmText('')
                    clearMessages()
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800 font-semibold mb-2">
                  {t('delete_account_consequences') || 'This will permanently delete:'}
                </p>
                <ul className="text-sm text-red-700 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    {t('delete_consequence_profile') || 'Your profile and all personal information'}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    {t('delete_consequence_applications') || 'All job applications and history'}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    {t('delete_consequence_messages') || 'All messages and conversations'}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    {t('delete_consequence_jobs') || 'All job postings (for employers)'}
                  </li>
                </ul>
              </div>

              {errorMessage && (
                <Alert type="error" message={errorMessage} onClose={() => setErrorMessage('')} />
              )}

              {hasPasswordAuth && (
                <Input
                  id="deletePassword"
                  type="password"
                  label={t('enter_password_to_confirm') || 'Enter your password to confirm'}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  data-testid="delete-password-input"
                />
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('type_delete_prompt') || 'Type DELETE to confirm'}
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                  className="block w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 border-slate-200 font-mono tracking-wider"
                  data-testid="delete-confirm-input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletePassword('')
                    setDeleteConfirmText('')
                    clearMessages()
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="flex-1"
                  onClick={handleDeleteAccount}
                  isLoading={deleteLoading}
                  disabled={deleteConfirmText !== 'DELETE' || (hasPasswordAuth && !deletePassword)}
                  data-testid="confirm-delete-button"
                >
                  {t('delete_account_permanently') || 'Delete Permanently'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import Navbar from '@/components/Navbar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import Link from 'next/link'
import { Lock, CheckCircle2 } from 'lucide-react'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { updatePassword, user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  useEffect(() => {
    // The user arrives here after /auth/callback exchanged the recovery code
    // for a session. If there's no session by the time auth finishes loading,
    // the link was invalid, expired, or already consumed.
    if (!authLoading && !user) {
      setError(t('invalid_reset_link') || 'Invalid or expired reset link. Please request a new one.')
    }
  }, [authLoading, user, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError(t('password_required') || 'Password is required')
      return
    }

    if (password.length < 8) {
      setError(t('password_min_length') || 'Password must be at least 8 characters')
      return
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError(t('password_strength') || 'Password must contain both letters and numbers')
      return
    }

    if (password !== confirmPassword) {
      setError(t('passwords_dont_match') || 'Passwords do not match')
      return
    }

    setLoading(true)
    const { error: updateError } = await updatePassword(password)

    if (updateError) {
      setError(updateError.message || t('reset_password_error') || 'Failed to reset password')
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
        <Navbar />
        <div className="flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-xl shadow-md text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {t('password_reset_success') || 'Password Reset Successful!'}
              </h2>
              <p className="text-sm text-slate-600">
                {t('password_reset_success_message') || 'Your password has been reset successfully. Redirecting to login...'}
              </p>
              <Button
                onClick={() => router.push('/login')}
                fullWidth
              >
                {t('go_to_login') || 'Go to Login'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <Navbar />
      <div className="flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
              {t('reset_password') || 'Reset Password'}
            </h1>
            <p className="text-sm text-slate-600">
              {t('reset_password_description') || 'Enter your new password below'}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-xl shadow-md">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert type="error" message={error} onClose={() => setError('')} />
              )}

              <Input
                id="password"
                name="password"
                type="password"
                label={t('new_password') || 'New Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder={t('password_placeholder') || 'Minimum 8 characters'}
                data-testid="reset-password-new"
              />

              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label={t('confirm_password') || 'Confirm Password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder={t('confirm_password_placeholder') || 'Re-enter your password'}
                data-testid="reset-password-confirm"
              />

              <Button
                type="submit"
                fullWidth
                isLoading={loading}
                data-testid="reset-password-submit"
              >
                {t('reset_password') || 'Reset Password'}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t('back_to_login') || 'Back to Login'}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}


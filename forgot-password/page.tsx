'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import Navbar from '@/components/Navbar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!email) {
      setError(t('email_required') || 'Email is required')
      return
    }

    setLoading(true)
    const { error: resetError } = await resetPassword(email)

    if (resetError) {
      setError(resetError.message || t('reset_password_error') || 'Failed to send reset email')
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <Navbar />
      <div className="flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
              {t('forgot_password') || 'Forgot Password?'}
            </h1>
            <p className="text-sm text-slate-600">
              {t('forgot_password_description') || "No worries! Enter your email and we'll send you a reset link."}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-xl shadow-md">
            {success ? (
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t('check_your_email') || 'Check Your Email'}
                </h2>
                <p className="text-sm text-slate-600">
                  {t('reset_email_sent') || `We've sent a password reset link to ${email}`}
                </p>
                <p className="text-xs text-slate-500">
                  {t('reset_email_instructions') || 'Click the link in the email to reset your password. The link will expire in 1 hour.'}
                </p>
                <div className="pt-3 space-y-2">
                  <Button
                    onClick={() => router.push('/login')}
                    fullWidth
                  >
                    {t('back_to_login') || 'Back to Login'}
                  </Button>
                  <button
                    onClick={() => {
                      setSuccess(false)
                      setEmail('')
                    }}
                    className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('send_another_email') || 'Send another email'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert type="error" message={error} onClose={() => setError('')} />
                )}

                <Input
                  id="email"
                  name="email"
                  type="email"
                  label={t('email') || 'Email'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder={t('email_placeholder') || 'you@example.com'}
                  data-testid="forgot-password-email"
                />

                <Button
                  type="submit"
                  fullWidth
                  isLoading={loading}
                  data-testid="forgot-password-submit"
                >
                  {t('send_reset_link') || 'Send Reset Link'}
                </Button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t('back_to_login') || 'Back to Login'}
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


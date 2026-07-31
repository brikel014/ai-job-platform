'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import Navbar from '@/components/Navbar'
import { LoginForm } from '@/components/auth/LoginForm'
import { Alert } from '@/components/ui/Alert'
import Link from 'next/link'
import { getWorkerProfile, getEmployerProfile } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'
import { isUnderage, MINIMUM_AGE } from '@/lib/validation/shared'
import type { UserRole } from '@/lib/types'

function LoginPageContent() {
  const { user, role, signOut, updateRole } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectingRef = useRef(false)
  const [underageError, setUnderageError] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Show error from OAuth callback
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      setAuthError(decodeURIComponent(error))
    }
  }, [searchParams])

  // Resolve the user's role and route them to the right place. Reads the
  // user from supabase directly so it works even if AuthProvider state hasn't
  // updated yet (e.g. immediately after a successful sign-in callback).
  const redirectAfterAuth = useCallback(
    async (roleHint?: UserRole | null) => {
      if (redirectingRef.current) return
      redirectingRef.current = true
      try {
        const supabase = createClient()
        const { data: { user: freshUser } } = await supabase.auth.getUser()
        if (!freshUser) {
          redirectingRef.current = false
          return
        }

        // Resolve role: prefer the hint / metadata, fall back to profile lookup
        // for legacy accounts whose user_metadata.role is missing.
        const metadataRole =
          (freshUser.user_metadata?.role as UserRole | undefined) ?? null
        let resolvedRole: UserRole | null = roleHint ?? metadataRole

        if (!resolvedRole) {
          const [empProfile, wkrProfile] = await Promise.all([
            getEmployerProfile(freshUser.id),
            getWorkerProfile(freshUser.id),
          ])
          if (empProfile) resolvedRole = 'employer'
          else if (wkrProfile) resolvedRole = 'worker'
        }

        // Backfill user_metadata.role if it was missing. Without this, the
        // destination layout (e.g. app/employer/layout.tsx) reads role from
        // useAuth() — which is sourced from user_metadata — and would be
        // stuck on its loading spinner because role would still be null.
        if (resolvedRole && !metadataRole) {
          await updateRole(resolvedRole)
        }

        if (resolvedRole === 'worker') {
          const profile = await getWorkerProfile(freshUser.id)
          if (profile?.date_of_birth && isUnderage(profile.date_of_birth)) {
            setUnderageError(true)
            await signOut()
            redirectingRef.current = false
            return
          }
          router.push('/worker/jobs')
        } else if (resolvedRole === 'employer') {
          const profile = await getEmployerProfile(freshUser.id)
          router.push(profile?.company_name ? '/employer/overview' : '/employer/profile')
        } else {
          // Authenticated but no role in metadata and no profile in either
          // table — typically a brand-new OAuth user who hasn't picked a role
          // yet. Send them to /signup to choose, mirroring /auth/callback.
          router.push('/signup')
        }
      } catch (err) {
        redirectingRef.current = false
        throw err
      }
    },
    [router, signOut, updateRole]
  )

  // Backup path: if a user lands on /login already authenticated (e.g. cookie
  // session restored on page load), redirect them. The LoginForm onSuccess
  // path handles the fresh-login case directly to avoid relying on this.
  useEffect(() => {
    if (user) {
      redirectAfterAuth(role ?? undefined)
    }
  }, [user, role, redirectAfterAuth])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <Navbar />
      <div className="flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
              {t('welcome_back') || 'Welcome Back'}
            </h1>
            <p className="text-sm text-slate-600">
              {t('sign_in_to_account') || 'Sign in to your account'}
            </p>
          </div>

          {/* OAuth Error */}
          {authError && (
            <div className="mb-4">
              <Alert
                type="error"
                message={authError}
                onClose={() => setAuthError(null)}
              />
            </div>
          )}

          {/* Underage Error */}
          {underageError && (
            <div className="mb-4">
              <Alert
                type="error"
                message={t('underage_error') || `You must be at least ${MINIMUM_AGE} years old to use this platform.`}
                onClose={() => setUnderageError(false)}
              />
            </div>
          )}

          {/* Login Card */}
          <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-xl shadow-md">
            <LoginForm onSuccess={() => redirectAfterAuth()} />
          </div>

          {/* Sign up links */}
          <div className="mt-6 text-center space-y-1.5">
            <p className="text-sm text-slate-600">{t('dont_have_account') || "Don't have an account?"}</p>
            <div className="flex flex-col sm:flex-row gap-1.5 justify-center">
              <Link
                href="/login/worker"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('sign_up_as_worker') || 'Sign up as Worker'}
              </Link>
              <span className="hidden sm:inline text-slate-400">|</span>
              <Link
                href="/login/employer"
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                {t('sign_up_as_employer') || 'Sign up as Employer'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  )
}

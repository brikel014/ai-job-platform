'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabaseClient'

export default function ConfirmEmailPage() {
  const { user, signIn, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(true)

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return

    // Check if user is already confirmed and logged in
    if (user) {
      // Check if email is confirmed
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email_confirmed_at) {
          // User is confirmed and logged in, redirect based on role
          const role = session.user.user_metadata?.role
          if (role === 'worker') {
            router.push('/worker/profile')
          } else if (role === 'employer') {
            router.push('/employer/profile')
          } else {
            router.push('/')
          }
        } else {
          // User is logged in but email not confirmed yet
          setCheckingEmail(false)
        }
      })
    } else {
      // User not logged in, show login form
      setCheckingEmail(false)
    }
  }, [user, authLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Login successful, redirect based on role
      const session = await supabase.auth.getSession()
      const userRole = session.data.session?.user.user_metadata?.role
      if (userRole === 'worker') {
        router.push('/worker/profile')
      } else if (userRole === 'employer') {
        router.push('/employer/profile')
      } else {
        router.push('/')
      }
    }
  }

  if (checkingEmail || authLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg text-slate-800">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white border border-slate-200 p-8 rounded-lg shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-800">
              Confirm Your Email
            </h2>
            <p className="mt-4 text-center text-sm text-slate-600">
              We've sent a confirmation email to your inbox. Please check your email and click the confirmation link.
            </p>
            <p className="mt-2 text-center text-sm text-slate-600">
              Once you've confirmed your email, you can log in below.
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  {t('email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Logging in...' : t('login')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


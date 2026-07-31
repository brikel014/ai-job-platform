'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/useLanguage'
import { useAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { 
  Briefcase, 
  Building2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

export default function SignupPage() {
  const { t } = useLanguage()
  const { user, role, loading } = useAuth()
  const router = useRouter()

  // Redirect authenticated users who already have a role away from signup
  // Users with no role (e.g. Google OAuth from login page) should stay and pick a role
  useEffect(() => {
    if (!loading && user && role) {
      const redirectPath = role === 'employer' ? '/employer/jobs' : '/worker/jobs'
      router.replace(redirectPath)
    }
  }, [user, role, loading, router])

  // Show loading while checking auth, or redirecting if user has a role
  if (loading || (user && role)) {
    return (
      <div className="min-h-screen bg-[#fafbfc]">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500">{loading ? 'Loading...' : 'Redirecting...'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 overflow-x-hidden">
      <Navbar />

      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[800px] h-[800px] bg-gradient-to-br from-blue-200/30 via-blue-100/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-100/30 via-purple-50/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-t from-blue-100/20 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <div className="animate-fade-in-up" style={{ animationFillMode: 'both' }}>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              <span className="text-slate-900">{t('home_connecting')}</span>
            </h1>
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {t('choose_how_to_use') || 'Choose how you want to use Stellio'}
            </p>
          </div>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">

          {/* Worker Card */}
          <div className="animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <Link href="/login/worker" className="block group">
              <div className="relative bg-white rounded-3xl border border-slate-200/60 p-7 sm:p-8 shadow-lg hover:shadow-xl hover:shadow-blue-100/50 hover:border-blue-200 transition-all duration-300 h-full overflow-hidden">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 rounded-t-3xl" />

                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-transparent to-indigo-50/0 group-hover:from-blue-50/40 group-hover:to-indigo-50/20 transition-all duration-300 rounded-3xl" />

                <div className="relative">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-800/20 group-hover:scale-105 transition-transform duration-300">
                      <Briefcase className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{t('for_workers')}</h2>
                      <p className="text-sm text-slate-500">{t('looking_for_job') || "I'm looking for a job"}</p>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 mb-8">
                    {[
                      'Create your profile in minutes',
                      'Browse and apply to jobs with one click',
                      'Get contacted directly by employers',
                      'Available in 12 languages',
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-slate-900 text-white font-semibold rounded-xl group-hover:bg-slate-800 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                    <span>{t('hero_cta_worker_short')}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Employer Card */}
          <div className="animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
            <Link href="/login/employer" className="block group">
              <div className="relative bg-white rounded-3xl border border-slate-200/60 p-7 sm:p-8 shadow-lg hover:shadow-xl hover:shadow-blue-100/50 hover:border-blue-200 transition-all duration-300 h-full overflow-hidden">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 rounded-t-3xl" />

                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-transparent to-indigo-50/0 group-hover:from-blue-50/40 group-hover:to-indigo-50/20 transition-all duration-300 rounded-3xl" />

                <div className="relative">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{t('for_employers')}</h2>
                      <p className="text-sm text-slate-500">{t('hiring_workers') || "I'm hiring workers"}</p>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 mb-8">
                    {[
                      'Post jobs and reach thousands of workers',
                      'Browse worker profiles and skills',
                      'Contact candidates directly',
                      'No agency fees or middlemen',
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl group-hover:from-blue-700 group-hover:to-blue-800 transition-all duration-300 shadow-lg shadow-blue-500/25 group-hover:shadow-xl group-hover:shadow-blue-500/30">
                    <span>{t('hero_cta_employer_short')}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Already have an account */}
        <div className="animate-fade-in-up text-center mt-8" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <p className="text-sm text-slate-500">
            {t('already_have_account_short') || 'Already have an account?'}{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

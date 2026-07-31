'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import Navbar from '@/components/Navbar'
import { RegisterForm } from '@/components/auth/RegisterForm'
import Link from 'next/link'
import {
  Briefcase,
  ArrowRight,
  Target,
  Zap,
  Shield,
} from 'lucide-react'

export default function WorkerSignupPage() {
  const { user, role, updateRole } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  // Redirect logged-in users to their appropriate dashboard
  // If authenticated but no role (e.g. Google OAuth from login page), assign worker role
  useEffect(() => {
    if (user && role) {
      const redirectPath = role === 'worker' ? '/worker/jobs' : '/employer/jobs'
      router.push(redirectPath)
    } else if (user && !role) {
      updateRole('worker').then(({ error }) => {
        if (!error) {
          router.push('/worker/jobs')
        }
      })
    }
  }, [user, role, router, updateRole])

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      {/* ==========================================
          HERO SECTION WITH SIGN UP FORM + 3 EASY STEPS
          ========================================== */}
      <section className="relative py-12 sm:py-16 lg:py-20 overflow-hidden bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large gradient orbs */}
          <div className="absolute -top-40 -right-40 w-[800px] h-[800px] bg-gradient-to-br from-blue-200/40 via-blue-100/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-100/40 via-purple-50/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-t from-blue-100/30 to-transparent rounded-full blur-3xl" />

          {/* Subtle grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgb(59, 130, 246) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            {/* Left Side - Sign Up Form */}
            <div className="w-full">
              <div className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 lg:p-10 border border-slate-100">
                  <Suspense fallback={<div className="text-center text-sm text-slate-600 py-6">Loading...</div>}>
                    <RegisterForm defaultRole="worker" />
                  </Suspense>

                  {/* Switch to employer */}
                  <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                    <p className="text-sm text-slate-600">
                      {t('worker_login_are_you_employer')}{' '}
                      <Link href="/login/employer" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                        {t('worker_login_sign_up_here')}
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - 3 Easy Steps */}
            <div className="hidden lg:block">
              <div className="animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                <div className="mb-8">
                  <span className="inline-block text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
                    {t('worker_login_how_it_works')}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                    {t('worker_login_find_work_steps')}
                  </h2>
                  <p className="text-slate-600">{t('worker_login_steps_subtitle')}</p>
                </div>

                <div className="space-y-5">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">1</div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{t('worker_login_step1_title')}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{t('worker_login_step1_desc')}</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">2</div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{t('worker_login_step2_title')}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{t('worker_login_step2_desc')}</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">3</div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{t('worker_login_step3_title')}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{t('worker_login_step3_desc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          WHY CHOOSE US SECTION
          ========================================== */}
      <section className="relative py-16 sm:py-20 bg-gradient-to-b from-white via-blue-50/30 to-white overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-blue-100/20 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-fade-in-up" style={{ animationFillMode: 'both' }}>
            <div className="text-center mb-12">
              <span className="inline-block text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
                {t('why_choose_us')}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                {t('worker_login_why_title')}
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                {t('worker_login_why_subtitle')}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                titleKey: 'worker_login_feature1_title' as const,
                descKey: 'worker_login_feature1_desc' as const,
              },
              {
                icon: Zap,
                titleKey: 'worker_login_feature2_title' as const,
                descKey: 'worker_login_feature2_desc' as const,
              },
              {
                icon: Shield,
                titleKey: 'worker_login_feature3_title' as const,
                descKey: 'worker_login_feature3_desc' as const,
              }
            ].map((feature, index) => (
              <div key={index} className="animate-fade-in-up" style={{ animationDelay: `${100 + index * 100}ms`, animationFillMode: 'both' }}>
                <div className="group relative bg-white rounded-2xl border border-slate-200/60 p-6 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 h-full overflow-hidden">
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-transparent to-indigo-50/0 group-hover:from-blue-50/50 group-hover:to-indigo-50/30 transition-all duration-300" />
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 group-hover:from-blue-600 group-hover:to-indigo-600 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 group-hover:scale-105">
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{t(feature.titleKey)}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{t(feature.descKey)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          FINAL CTA SECTION
          ========================================== */}
      <section className="py-20 sm:py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in-up" style={{ animationFillMode: 'both' }}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-5">
              {t('worker_login_cta_title')}
            </h2>
            <p className="text-base text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('worker_login_cta_subtitle')}
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 font-bold text-base rounded-xl hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              {t('worker_login_create_free_profile')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-white">Stellio</span>
            </div>
            <p className="text-xs">© {new Date().getFullYear()} Stellio. {t('all_rights_reserved')}</p>
            <div className="flex gap-6 text-xs">
              <Link href="/privacy-security" className="hover:text-white transition-colors">{t('footer_privacy_policy')}</Link>
              <Link href="#" className="hover:text-white transition-colors">{t('footer_terms_of_service')}</Link>
              <Link href="#" className="hover:text-white transition-colors">{t('contact')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

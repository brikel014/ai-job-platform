'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import Navbar from '@/components/Navbar'
import { RegisterForm } from '@/components/auth/RegisterForm'
import Link from 'next/link'
import {
  Building2,
  Briefcase,
  Zap,
  Search,
  MessageSquare,
  FileCheck,
  Mail,
  Phone,
  Send,
  Loader2,
  Check,
  Sparkles
} from 'lucide-react'

export default function EmployerSignupPage() {
  const { user, role, updateRole } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [justSignedUp, setJustSignedUp] = useState(false)

  // Contact form state
  const [contactForm, setContactForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    message: ''
  })
  const [contactStatus, setContactStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [contactMessage, setContactMessage] = useState('')

  // Redirect logged-in users to their appropriate dashboard.
  // Skip when signup just completed on this page — RegisterForm's onSuccess
  // handler routes new employers straight to the create-profile flow.
  // If authenticated but no role (e.g. Google OAuth from login page), assign employer role.
  useEffect(() => {
    if (justSignedUp) return
    if (user && role) {
      const redirectPath = role === 'worker' ? '/worker/jobs' : '/employer/jobs'
      router.push(redirectPath)
    } else if (user && !role) {
      updateRole('employer').then(({ error }) => {
        if (!error) {
          router.push('/employer/profile')
        }
      })
    }
  }, [user, role, router, updateRole, justSignedUp])

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactForm.email || !contactForm.companyName || contactStatus === 'loading') return

    setContactStatus('loading')
    
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      })
      if (!res.ok) throw new Error('Failed to send')
      setContactStatus('success')
      setContactMessage(t('emp_onboard_thank_you'))
      setContactForm({ companyName: '', contactName: '', email: '', phone: '', message: '' })
    } catch {
      setContactStatus('error')
      setContactMessage(t('emp_onboard_error_message'))
    }

    setTimeout(() => {
      setContactStatus('idle')
      setContactMessage('')
    }, 5000)
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      {/* ==========================================
          HERO - SIGN UP FORM + 3 EASY STEPS (like worker page)
          ========================================== */}
      <section className="relative py-12 sm:py-16 lg:py-20 overflow-hidden bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[800px] h-[800px] bg-gradient-to-br from-blue-200/40 via-blue-100/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-100/40 via-purple-50/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-t from-blue-100/30 to-transparent rounded-full blur-3xl" />
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
                  <Suspense fallback={<div className="text-center text-sm text-slate-600 py-6">{t('loading')}...</div>}>
                    <RegisterForm
                      defaultRole="employer"
                      onSuccess={() => {
                        setJustSignedUp(true)
                        router.push('/employer/profile')
                      }}
                    />
                  </Suspense>

                  {/* Switch to worker */}
                  <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                    <p className="text-sm text-slate-600">
                      {t('emp_onboard_looking_work')}{' '}
                      <Link href="/login/worker" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                        {t('emp_onboard_signup_worker')}
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
                    {t('emp_onboard_how_works')}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                    {t('emp_onboard_hire_steps')}
                  </h2>
                  <p className="text-slate-600">{t('emp_onboard_hire_fast')}</p>
                </div>

                <div className="space-y-5">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">1</div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{t('emp_onboard_step1_title')}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{t('emp_onboard_step1_desc')}</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">2</div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{t('emp_onboard_step2_title')}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{t('emp_onboard_step2_desc')}</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">3</div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{t('emp_onboard_step3_title')}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{t('emp_onboard_step3_desc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          CONTACT OUR TEAM - FREE ONBOARDING
          ========================================== */}
      <section className="relative py-12 sm:py-16 lg:py-20 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Side - Info */}
            <div className="animate-fade-in-up" style={{ animationFillMode: 'both' }}>
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-6">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-white/90">{t('emp_onboard_free_badge')}</span>
                </span>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  {t('emp_onboard_hero_title')}
                </h2>

                <p className="text-lg text-blue-100 mb-8 leading-relaxed">
                  {t('emp_onboard_hero_desc')}
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    t('emp_onboard_benefit_setup'),
                    t('emp_onboard_benefit_first_job'),
                    t('emp_onboard_benefit_candidates'),
                    t('emp_onboard_benefit_support')
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-white/90">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {['T', 'S', 'M'].map((initial, i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">{initial}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{t('emp_onboard_support_team')}</p>
                    <p className="text-blue-200 text-sm">{t('emp_onboard_responds_24h')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Contact Form */}
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
              <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{t('emp_onboard_contact_us')}</h3>
                  <p className="text-slate-600">{t('emp_onboard_form_desc')}</p>
                </div>

                {contactStatus === 'success' ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">{t('emp_onboard_message_sent')}</h4>
                    <p className="text-slate-600">{contactMessage}</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {t('emp_onboard_company_label')}
                        </label>
                        <input
                          type="text"
                          value={contactForm.companyName}
                          onChange={(e) => setContactForm({ ...contactForm, companyName: e.target.value })}
                          placeholder={t('emp_onboard_company_placeholder')}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {t('emp_onboard_contact_name')}
                        </label>
                        <input
                          type="text"
                          value={contactForm.contactName}
                          onChange={(e) => setContactForm({ ...contactForm, contactName: e.target.value })}
                          placeholder={t('emp_onboard_name_placeholder')}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {t('emp_onboard_email_label')}
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="email"
                            value={contactForm.email}
                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                            placeholder={t('emp_onboard_email_placeholder')}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {t('emp_onboard_phone_label')}
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="tel"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                            placeholder={t('emp_onboard_phone_placeholder')}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {t('emp_onboard_how_help')}
                      </label>
                      <textarea
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder={t('emp_onboard_hiring_placeholder')}
                        rows={4}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none"
                      />
                    </div>

                    {contactStatus === 'error' && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                        {contactMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={contactStatus === 'loading' || !contactForm.email || !contactForm.companyName}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {contactStatus === 'loading' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span>{t('emp_onboard_get_onboarding')}</span>
                        </>
                      )}
                    </button>

                    <p className="text-xs text-slate-500 text-center">
                      {t('emp_onboard_privacy_note')}
                    </p>
                  </form>
                )}
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
                {t('emp_onboard_why_choose')}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                {t('emp_onboard_smart_way')} <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">{t('emp_onboard_hire_workers')}</span>
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                {t('emp_onboard_why_desc')}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: t('emp_onboard_fast_hiring'),
                description: t('emp_onboard_fast_hiring_desc')
              },
              {
                icon: Search,
                title: t('emp_onboard_quality_candidates'),
                description: t('emp_onboard_quality_desc')
              },
              {
                icon: MessageSquare,
                title: t('emp_onboard_direct_contact'),
                description: t('emp_onboard_direct_contact_desc')
              },
              {
                icon: FileCheck,
                title: t('emp_onboard_compliance'),
                description: t('emp_onboard_compliance_desc')
              },
            ].map((feature, index) => (
              <div key={index} className="animate-fade-in-up" style={{ animationDelay: `${100 + index * 100}ms`, animationFillMode: 'both' }}>
                <div className="group relative bg-white rounded-2xl border border-slate-200/60 p-6 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 h-full overflow-hidden">
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-transparent to-indigo-50/0 group-hover:from-blue-50/50 group-hover:to-indigo-50/30 transition-all duration-300" />
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 group-hover:from-blue-600 group-hover:to-indigo-600 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 group-hover:scale-105">
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
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
            <p className="text-xs">© {new Date().getFullYear()} Stellio. {t('all_rights_reserved')}.</p>
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

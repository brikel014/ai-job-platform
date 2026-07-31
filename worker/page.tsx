'use client'

import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getJobPostings } from '@/lib/db'
import { ProfileTooltip } from '@/components/onboarding/ProfileTooltip'

export default function WorkerLandingPage() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const [jobCount, setJobCount] = useState(0)
  // No longer checking profile - workers can see landing page and jobs first
  // ProfileTooltip component will show a popup prompting them to complete profile

  useEffect(() => {
    const fetchJobCount = async () => {
      const jobs = await getJobPostings({ status: 'active' })
      setJobCount(jobs.length)
    }
    fetchJobCount()
  }, [])

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-0">
      <Navbar />
      <ProfileTooltip />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-slate-800 leading-tight">
              {t('landing_hero_title')}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-slate-600 max-w-3xl mx-auto">
              {t('landing_hero_subtitle')}
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-10">
              <div className="bg-white border border-slate-200 rounded-lg px-6 py-4 shadow-md">
                <div className="text-3xl font-bold text-slate-800">{jobCount}+</div>
                <div className="text-sm text-slate-600">{t('jobs')}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg px-6 py-4 shadow-md">
                <div className="text-3xl font-bold text-slate-800">1</div>
                <div className="text-sm text-slate-600">{t('landing_apply_one_click')}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg px-6 py-4 shadow-md">
                <div className="text-3xl font-bold text-slate-800">0</div>
                <div className="text-sm text-slate-600">{t('landing_no_cv')}</div>
              </div>
            </div>

            {!user ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  {t('landing_get_started')}
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 text-lg font-semibold"
                >
                  {t('login')}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/worker/jobs"
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  {t('jobs')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-800">
            {t('landing_features_title')}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">
                {t('landing_feature_one_click')}
              </h3>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">
                {t('landing_feature_no_cv')}
              </h3>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">
                {t('landing_feature_multiple_jobs')}
              </h3>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🇩🇪</div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">
                {t('landing_feature_germany')}
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-800">
            {t('landing_how_it_works')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">
                {t('landing_step1')}
              </h3>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">
                {t('landing_step2')}
              </h3>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">
                {t('landing_step3')}
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-16 bg-blue-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              {t('landing_find_job_today')}
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              {t('landing_apply_one_click')} - {t('landing_no_cv')}
            </p>
            <Link
              href="/signup"
              className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 text-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              {t('landing_get_started')}
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}


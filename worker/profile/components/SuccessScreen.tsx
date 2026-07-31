'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { useLanguage } from '@/lib/useLanguage'
import { 
  Briefcase, 
  ArrowRight, 
  Check, 
  Search, 
  FileText, 
  User,
  Sparkles
} from 'lucide-react'

const PENDING_JOB_KEY = 'pending_job_application'

export const SuccessScreen: React.FC = () => {
  const router = useRouter()
  const { t } = useLanguage()
  const [pendingJobId, setPendingJobId] = useState<string | null>(null)

  useEffect(() => {
    posthog.capture('worker_profile_created')
    // Check if there's a pending job application
    const jobId = localStorage.getItem(PENDING_JOB_KEY)
    if (jobId) {
      setPendingJobId(jobId)
    }
  }, [])


  const handleBrowseJobs = () => {
    localStorage.removeItem(PENDING_JOB_KEY)
    router.push('/worker/jobs')
  }

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-16 px-4">
      {/* Success Icon */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <Check className="w-12 h-12 text-white" strokeWidth={3} />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
          {t('profile_created_successfully')}
        </h1>
        <p className="text-lg text-slate-600">
          {t('profile_ready')}
        </p>
      </div>



      {/* Action Cards */}
      <div className="space-y-3">
        {/* Primary CTA */}
        <button 
          onClick={handleBrowseJobs} 
          className="w-full flex items-center gap-4 p-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <span className="block font-semibold text-white">{t('browse_jobs')}</span>
            <span className="block text-sm text-blue-100">{t('browse_jobs_to_apply')}</span>
          </div>
          <ArrowRight className="w-5 h-5 text-blue-200 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </button>

        {/* Secondary CTAs */}
        <button 
          onClick={() => router.push('/worker/applications')} 
          className="w-full flex items-center gap-4 p-5 bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 rounded-2xl transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 text-left">
            <span className="block font-semibold text-slate-900">{t('applications')}</span>
            <span className="block text-sm text-slate-500">{t('track_your_applications')}</span>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
        </button>
        
        <button 
          onClick={() => router.push('/worker/view-profile')} 
          className="w-full flex items-center gap-4 p-5 bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 rounded-2xl transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 text-left">
            <span className="block font-semibold text-slate-900">{t('view_profile')}</span>
            <span className="block text-sm text-slate-500">{t('see_how_employers_view_you')}</span>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
        </button>
      </div>
    </div>
  )
}

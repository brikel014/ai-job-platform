'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { useJobFormData } from '@/hooks/useJobFormData'
import { getEmployerProfile, createJobPosting, saveJobDraft, getJobPostingById } from '@/lib/db'
import type { WorkType, Language, JobType, SalaryRange, JobPosting } from '@/lib/types'
import { Briefcase, Clock, Euro, Calendar, Globe, Home, Utensils, MapPin, Users, ArrowLeft, Check } from 'lucide-react'
import { UnifiedLocationInput, StructuredLocation } from '@/components/ui/UnifiedLocationInput'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { logError } from '@/lib/logger'

export default function CreateJobPage() {
  const { user, role, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [employerProfile, setEmployerProfile] = useState<Awaited<ReturnType<typeof getEmployerProfile>>>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  
  const { formData, updateField, resetForm, setFormData } = useJobFormData(employerProfile?.industry)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const formDataRef = useRef(formData)
  const employerProfileRef = useRef(employerProfile)
  const currentDraftIdRef = useRef(currentDraftId)
  const creatingRef = useRef(creating)
  const jobPublishedRef = useRef(false)
  const today = new Date().toISOString().split('T')[0]

  // Keep refs in sync
  useEffect(() => { formDataRef.current = formData }, [formData])
  useEffect(() => { employerProfileRef.current = employerProfile }, [employerProfile])
  useEffect(() => { currentDraftIdRef.current = currentDraftId }, [currentDraftId])
  useEffect(() => { creatingRef.current = creating }, [creating])
  
  // Location display state
  const buildLocationDisplay = () => {
    const parts = []
    if (formData.location_address) parts.push(formData.location_address)
    else if (formData.location_city) parts.push(formData.location_city)
    if (formData.location_country && !parts.join('').includes(formData.location_country)) {
      parts.push(formData.location_country)
    }
    return parts.join(', ')
  }
  const [locationDisplayValue, setLocationDisplayValue] = useState<string>(buildLocationDisplay)

  // Load employer profile and check for draft
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return
      
      const profile = await getEmployerProfile(user.id)
      if (!profile) {
        router.push('/employer/profile')
        return
      }
      
      setEmployerProfile(profile)
      
      // Check if we should load a draft from URL
      const draftId = searchParams?.get('draft')
      if (draftId) {
        const draft = await getJobPostingById(draftId)
        if (draft && draft.status === 'draft' && draft.employer_id === profile.id) {
          loadDraftIntoForm(draft)
          setCurrentDraftId(draft.id)
        }
      }
      
      setLoading(false)
    }
    
    if (!authLoading && user) {
      loadProfile()
    }
  }, [user, authLoading, router, searchParams])

  // Load draft data into form
  const loadDraftIntoForm = (draft: JobPosting) => {
    setFormData({
      title: draft.title || '',
      description: draft.description || '',
      work_type: draft.work_type,
      years_of_experience: draft.years_of_experience || 0,
      salary_range: draft.salary_range || 'negotiable',
      certification_requirements: draft.certification_requirements || [],
      language_requirements: draft.language_requirements || [],
      start_date: draft.start_date || '',
      end_date: draft.end_date || '',
      job_type: draft.job_type,
      accommodation_included: draft.accommodation_included || false,
      food_included: draft.food_included || false,
      location_city: draft.location_city || '',
      location_country: draft.location_country || '',
      location_address: draft.location_address || '',
      positions_available: draft.positions_available || 1,
      work_permit_required: draft.work_permit_required || false,
      work_permit_sponsorship_offered: draft.work_permit_sponsorship_offered || false,
    })
    
    // Update location display
    const parts = []
    if (draft.location_address) parts.push(draft.location_address)
    else if (draft.location_city) parts.push(draft.location_city)
    if (draft.location_country && !parts.join('').includes(draft.location_country)) {
      parts.push(draft.location_country)
    }
    setLocationDisplayValue(parts.join(', '))
  }

  // Auto-save draft with debouncing
  const autoSaveDraft = useCallback(async () => {
    if (!employerProfile || savingDraft) return
    
    // Only save if there's some content
    if (!formData.title?.trim() && !formData.description?.trim()) return
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    // Set new timeout
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setSavingDraft(true)
      try {
        const draftData = {
          title: formData.title || '',
          description: formData.description || '',
          work_type: formData.work_type,
          years_of_experience: formData.years_of_experience,
          salary_range: formData.salary_range,
          certification_requirements: formData.certification_requirements,
          language_requirements: formData.language_requirements,
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined,
          job_type: formData.job_type,
          accommodation_included: formData.accommodation_included,
          food_included: formData.food_included,
          location_city: formData.location_city || undefined,
          location_country: formData.location_country || undefined,
          location_address: formData.location_address || undefined,
          positions_available: formData.positions_available,
          work_permit_required: formData.work_permit_required,
          work_permit_sponsorship_offered: formData.work_permit_sponsorship_offered,
        }
        
        const savedDraft = await saveJobDraft(employerProfile.id, currentDraftId, draftData)
        if (savedDraft && !currentDraftId) {
          setCurrentDraftId(savedDraft.id)
        }
      } catch (error) {
        logError('CreateJob', error, undefined, 'Error auto-saving draft')
      } finally {
        setSavingDraft(false)
      }
    }, 2000) // 2 second debounce
  }, [employerProfile, formData, currentDraftId, savingDraft])

  // Auto-save when form data changes
  useEffect(() => {
    if (employerProfile) {
      autoSaveDraft()
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [formData, employerProfile, autoSaveDraft])

  // Flush pending draft save on unmount (e.g. back button)
  useEffect(() => {
    return () => {
      // If we're in the middle of creating or already published, don't save a draft
      if (creatingRef.current || jobPublishedRef.current) return

      const data = formDataRef.current
      const profile = employerProfileRef.current
      if (!profile) return
      if (!data.title?.trim() && !data.description?.trim()) return

      // Clear any pending debounce
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }

      const draftData = {
        title: data.title || '',
        description: data.description || '',
        work_type: data.work_type,
        years_of_experience: data.years_of_experience,
        salary_range: data.salary_range,
        certification_requirements: data.certification_requirements,
        language_requirements: data.language_requirements,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
        job_type: data.job_type,
        accommodation_included: data.accommodation_included,
        food_included: data.food_included,
        location_city: data.location_city || undefined,
        location_country: data.location_country || undefined,
        location_address: data.location_address || undefined,
        positions_available: data.positions_available,
        work_permit_required: data.work_permit_required,
        work_permit_sponsorship_offered: data.work_permit_sponsorship_offered,
      }

      // Fire-and-forget save on unmount
      saveJobDraft(profile.id, currentDraftIdRef.current, draftData).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auth is handled by the employer layout

  const workTypes: WorkType[] = ['construction', 'manufacturing', 'logistics_warehousing', 'agriculture', 'hospitality_tourism', 'cleaning_maintenance', 'care_household', 'transport_delivery', 'general_temporary', 'other']
  const languages: Language[] = ['en', 'de', 'sr', 'hr', 'bs', 'mk', 'sl', 'pl', 'bg', 'ro', 'el', 'sq', 'ar', 'uk']
  
  const languageFlags: Record<Language, string> = {
    en: '🇬🇧',
    de: '🇩🇪',
    sr: '🇷🇸',
    hr: '🇭🇷',
    bs: '🇧🇦',
    mk: '🇲🇰',
    sl: '🇸🇮',
    pl: '🇵🇱',
    bg: '🇧🇬',
    ro: '🇷🇴',
    el: '🇬🇷',
    sq: '🇦🇱',
    ar: '🇸🇦',
    uk: '🇺🇦',
  }

  const inputClasses = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base"
  const labelClasses = "block text-sm font-semibold text-slate-700 mb-2"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (creating || !user || !employerProfile) return
    
    // Cancel any pending auto-save to prevent it from running after draft is deleted
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
      autoSaveTimeoutRef.current = null
    }
    
    setCreating(true)
    setError(null)
    
    try {
      // Validate required fields
      if (!formData.title?.trim()) {
        setError('Please enter a job title.')
        setCreating(false)
        return
      }
      
      if (!formData.description?.trim()) {
        setError('Please enter a job description.')
        setCreating(false)
        return
      }
      
      if (!formData.start_date) {
        setError(t('start_date_required'))
        setCreating(false)
        return
      }

      if (formData.start_date < today) {
        setError(t('start_date_not_in_past'))
        setCreating(false)
        return
      }

      if (formData.end_date && formData.end_date <= formData.start_date) {
        setError(t('end_date_after_start'))
        setCreating(false)
        return
      }

      if (!formData.location_city?.trim()) {
        setError('Please enter a city.')
        setCreating(false)
        return
      }
      
      if (!formData.location_country?.trim()) {
        setError('Please select a country.')
        setCreating(false)
        return
      }
      
      if (!formData.salary_range) {
        setError('Please select a salary range.')
        setCreating(false)
        return
      }
      
      const jobData = {
        employer_id: employerProfile.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        work_type: formData.work_type,
        years_of_experience: formData.years_of_experience,
        salary_range: formData.salary_range,
        certification_requirements: formData.certification_requirements,
        language_requirements: formData.language_requirements,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        job_type: formData.job_type,
        accommodation_included: formData.accommodation_included,
        food_included: formData.food_included,
        location_city: formData.location_city.trim(),
        location_country: formData.location_country.trim(),
        location_address: formData.location_address?.trim() || undefined,
        positions_available: formData.positions_available || 1,
        status: 'active' as const,
      }
      
      const newJob = await createJobPosting(jobData)
      if (newJob) {
        jobPublishedRef.current = true
        posthog.capture('job_posted', {
          work_type: formData.work_type,
          job_type: formData.job_type,
          location_city: formData.location_city,
          location_country: formData.location_country,
          salary_range: formData.salary_range,
          positions_available: formData.positions_available,
        })
        // Delete draft if it exists
        if (currentDraftId) {
          const { deleteJobDraft } = await import('@/lib/db')
          await deleteJobDraft(currentDraftId)
        }
        // Show success toast
        setToast({ message: t('job_posting_created_successfully'), type: 'success' })
        // Redirect after a short delay so user can see the toast
        setTimeout(() => {
          router.push('/employer/jobs')
        }, 1500)
      } else {
        setError('Failed to create job posting. Please try again.')
      }
    } catch (err) {
      logError('CreateJob', err, undefined, 'Error creating job')
      setError('Failed to create job posting. Please try again.')
    }
    
    setCreating(false)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" data-testid="create-job-page">
      {/* Auto-save indicator */}
      {savingDraft && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 z-40">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {t('saving_draft') || 'Saving draft...'}
        </div>
      )}
      
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          data-testid="job-created-toast"
        />
      )}
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/employer/jobs')}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('go_back_to_jobs')}
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{t('create_job')}</h1>
              <p className="text-slate-500 text-sm">{t('fill_in_job_details') || 'Fill in the details for your new job posting'}</p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm" role="alert">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-5">
              <Briefcase className="w-5 h-5 text-blue-500" />
              <span>{t('basic_information')}</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={labelClasses}>{t('title')} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  disabled={creating}
                  placeholder="e.g., Construction Worker, Kitchen Helper"
                  className={inputClasses}
                  data-testid="create-job-title"
                />
              </div>
              
              <div>
                <label className={labelClasses}>{t('description')} <span className="text-red-500">*</span></label>
                <textarea
                  name="description"
                  required
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={5}
                  disabled={creating}
                  placeholder="Describe the job responsibilities, requirements, and what makes this position attractive..."
                  className={inputClasses + " resize-none"}
                  data-testid="create-job-description"
                />
              </div>
            </div>
          </div>

          {/* Job Details Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-5">
              <Clock className="w-5 h-5 text-blue-500" />
              <span>{t('job_details')}</span>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>{t('work_type')}</label>
                  <select
                    name="work_type"
                    value={formData.work_type}
                    onChange={(e) => updateField('work_type', e.target.value as WorkType)}
                    className={inputClasses + " cursor-pointer"}
                    disabled={creating}
                    data-testid="create-job-work-type"
                  >
                    {workTypes.map(type => (
                      <option key={type} value={type}>{t(type)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>{t('years_of_experience')}</label>
                  <select
                    name="years_of_experience"
                    value={formData.years_of_experience}
                    onChange={(e) => updateField('years_of_experience', parseInt(e.target.value))}
                    className={inputClasses + " cursor-pointer"}
                    disabled={creating}
                    data-testid="create-job-years-experience"
                  >
                    <option value={0}>{t('no_experience_required')}</option>
                    <option value={1}>1 {t('year')}</option>
                    <option value={2}>2 {t('years')}</option>
                    <option value={3}>3 {t('years')}</option>
                    <option value={5}>5+ {t('years')}</option>
                    <option value={10}>10+ {t('years')}</option>
                  </select>
                </div>
              </div>
              
              {/* Job Type Selection */}
              <div>
                <label className={labelClasses}>{t('job_type')} <span className="text-red-500">*</span></label>
                <select
                  name="job_type"
                  required
                  value={formData.job_type}
                  onChange={(e) => updateField('job_type', e.target.value as JobType)}
                  className={inputClasses + " cursor-pointer"}
                  disabled={creating}
                  data-testid="create-job-job-type"
                >
                  <option value="permanent">{t('job_type_permanent')}</option>
                  <option value="fixed_term">{t('job_type_fixed_term')}</option>
                  <option value="temporary">{t('job_type_temporary')}</option>
                  <option value="part_time">{t('job_type_part_time')}</option>
                  <option value="one_day">{t('job_type_one_day')}</option>
                  <option value="seasonal">{t('job_type_seasonal')}</option>
                  <option value="minijob">{t('job_type_minijob')}</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>{t('start_date')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="date"
                      name="start_date"
                      required
                      min={today}
                      value={formData.start_date}
                      onChange={(e) => updateField('start_date', e.target.value)}
                      className={inputClasses + " pl-12"}
                      disabled={creating}
                      data-testid="create-job-start-date"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>{t('end_date')}</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="date"
                      name="end_date"
                      min={formData.start_date || today}
                      value={formData.end_date}
                      onChange={(e) => updateField('end_date', e.target.value)}
                      className={inputClasses + " pl-12"}
                      disabled={creating}
                      data-testid="create-job-end-date"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-5">
              <MapPin className="w-5 h-5 text-blue-500" />
              <span>{t('job_location')}</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <UnifiedLocationInput
                  value={locationDisplayValue}
                  onChange={setLocationDisplayValue}
                  onLocationChange={(location: StructuredLocation) => {
                    let streetAddress = ''
                    if (location.route) {
                      streetAddress = location.street_number 
                        ? `${location.route} ${location.street_number}` 
                        : location.route
                      if (location.postal_code) {
                        streetAddress = `${streetAddress}, ${location.postal_code}`
                      }
                    }
                    
                    if (streetAddress) {
                      updateField('location_address', streetAddress)
                    } else {
                      updateField('location_address', '')
                    }
                    
                    if (location.city) {
                      updateField('location_city', location.city)
                    }
                    if (location.country_code) {
                      updateField('location_country', location.country_code.toUpperCase())
                    } else if (location.country) {
                      updateField('location_country', location.country)
                    }
                  }}
                  label={t('job_location')}
                  required
                  disabled={creating}
                  placeholder={t('location_placeholder') || 'Enter city, address, or location...'}
                  data-testid="create-job-location"
                />
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                  <span className="text-amber-500">ℹ️</span>
                  {t('address_visible_note')}
                </p>
              </div>

              {/* Show parsed location for transparency */}
              {(formData.location_city || formData.location_country) && (
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                  <p className="font-medium text-slate-700 mb-1">{t('parsed_location') || 'Detected location'}:</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {formData.location_city && (
                      <span><span className="text-slate-500">{t('city')}:</span> {formData.location_city}</span>
                    )}
                    {formData.location_country && (
                      <span><span className="text-slate-500">{t('country')}:</span> {formData.location_country}</span>
                    )}
                    {formData.location_address && (
                      <span><span className="text-slate-500">{t('address')}:</span> {formData.location_address}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Languages Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-5">
              <Globe className="w-5 h-5 text-blue-500" />
              <span>{t('language_requirements')}</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {languages.map(lang => (
                <label 
                  key={lang} 
                  title={lang.toUpperCase()}
                  className={`flex items-center justify-center w-12 h-12 rounded-xl border-2 cursor-pointer transition-all duration-200 text-2xl ${
                    formData.language_requirements.includes(lang)
                      ? 'bg-blue-50 border-blue-500 shadow-md scale-110'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:scale-105'
                  }`}
                  data-testid={`create-job-language-${lang}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.language_requirements.includes(lang)}
                    onChange={() => {
                      const langs = formData.language_requirements.includes(lang)
                        ? formData.language_requirements.filter(l => l !== lang)
                        : [...formData.language_requirements, lang]
                      updateField('language_requirements', langs)
                    }}
                    disabled={creating}
                    className="sr-only"
                  />
                  <span role="img" aria-label={lang.toUpperCase()}>{languageFlags[lang]}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Salary Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-5">
              <Euro className="w-5 h-5 text-blue-500" />
              <span>{t('compensation')}</span>
            </div>
          
            <div>
              <label className={labelClasses}>{t('salary_range')} <span className="text-red-500">*</span></label>
              <select
                name="salary_range"
                required
                value={formData.salary_range}
                onChange={(e) => updateField('salary_range', e.target.value as SalaryRange)}
                className={inputClasses + " cursor-pointer"}
                disabled={creating}
                data-testid="create-job-salary-range"
              >
                <option value="under_500">{t('salary_under_500')}</option>
                <option value="500_1000">{t('salary_500_1000')}</option>
                <option value="1000_1500">{t('salary_1000_1500')}</option>
                <option value="1500_2000">{t('salary_1500_2000')}</option>
                <option value="2000_2500">{t('salary_2000_2500')}</option>
                <option value="2500_3000">{t('salary_2500_3000')}</option>
                <option value="3000_3500">{t('salary_3000_3500')}</option>
                <option value="3500_4000">{t('salary_3500_4000')}</option>
                <option value="4000_4500">{t('salary_4000_4500')}</option>
                <option value="4500_5000">{t('salary_4500_5000')}</option>
                <option value="over_5000">{t('salary_over_5000')}</option>
                <option value="negotiable">{t('salary_negotiable')}</option>
              </select>
              <p className="text-sm text-slate-500 mt-1">{t('salary_range_note')}</p>
            </div>
          </div>

          {/* Positions Available Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-5">
              <Users className="w-5 h-5 text-blue-500" />
              <span>{t('positions_available')}</span>
            </div>
            
            <div>
              <label className={labelClasses}>{t('how_many_workers')} <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateField('positions_available', Math.max(1, formData.positions_available - 1))}
                  disabled={creating || formData.positions_available <= 1}
                  className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xl font-bold text-slate-600"
                >
                  −
                </button>
                <input
                  type="number"
                  name="positions_available"
                  min="1"
                  max="100"
                  value={formData.positions_available}
                  onChange={(e) => updateField('positions_available', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 text-center px-3 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all duration-200 text-lg font-semibold"
                  disabled={creating}
                  data-testid="create-job-positions-available"
                />
                <button
                  type="button"
                  onClick={() => updateField('positions_available', Math.min(100, formData.positions_available + 1))}
                  disabled={creating || formData.positions_available >= 100}
                  className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xl font-bold text-slate-600"
                >
                  +
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-2">{t('positions_available_note')}</p>
            </div>
          </div>
          
          {/* Benefits Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-5">
              <Home className="w-5 h-5 text-blue-500" />
              <span>{t('benefits')}</span>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <label 
                className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  formData.accommodation_included
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                data-testid="create-job-accommodation-label"
              >
                <input
                  type="checkbox"
                  name="accommodation_included"
                  checked={formData.accommodation_included}
                  onChange={(e) => updateField('accommodation_included', e.target.checked)}
                  disabled={creating}
                  className="sr-only"
                  data-testid="create-job-accommodation"
                />
                <Home className={`w-5 h-5 ${formData.accommodation_included ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="font-medium">{t('accommodation_included')}</span>
              </label>
              
              <label 
                className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  formData.food_included
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  name="food_included"
                  checked={formData.food_included}
                  onChange={(e) => updateField('food_included', e.target.checked)}
                  disabled={creating}
                  className="sr-only"
                  data-testid="create-job-food"
                />
                <Utensils className={`w-5 h-5 ${formData.food_included ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="font-medium">{t('food_included')}</span>
              </label>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
              data-testid="create-job-submit"
            >
              {creating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('creating') || 'Creating...'}
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {t('create_job')}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/employer/jobs')}
              disabled={creating}
              className="px-8 py-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

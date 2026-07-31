'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { getEmployerProfile, getJobPosting, updateJobPosting, deactivateJobPosting } from '@/lib/db'
import type { JobPosting, WorkType, Language, JobType, SalaryRange } from '@/lib/types'
import { Briefcase, Clock, Euro, Calendar, Globe, Home, Utensils, MapPin, Users, ArrowLeft, Check, Pencil, X, Pause } from 'lucide-react'
import { UnifiedLocationInput, StructuredLocation } from '@/components/ui/UnifiedLocationInput'
import { logError } from '@/lib/logger'

export default function JobDetailsPage() {
  const { user, loading: authLoading } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  
  const [job, setJob] = useState<JobPosting | null>(null)
  const [employerProfile, setEmployerProfile] = useState<Awaited<ReturnType<typeof getEmployerProfile>>>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    work_type: 'construction' as WorkType,
    years_of_experience: 0,
    salary_range: '1500_2000' as SalaryRange,
    language_requirements: [] as Language[],
    start_date: '',
    end_date: '',
    job_type: 'permanent' as JobType,
    accommodation_included: false,
    food_included: false,
    location_city: '',
    location_country: '',
    location_address: '',
    positions_available: 1,
  })
  
  const [locationDisplayValue, setLocationDisplayValue] = useState('')

  // Load job and employer profile
  useEffect(() => {
    const loadData = async () => {
      if (!user || !jobId) return
      
      const [profile, jobData] = await Promise.all([
        getEmployerProfile(user.id),
        getJobPosting(jobId)
      ])
      
      if (!profile) {
        router.push('/employer/profile')
        return
      }
      
      if (!jobData) {
        router.push('/employer/jobs')
        return
      }
      
      // Verify the job belongs to this employer
      if (jobData.employer_id !== profile.id) {
        router.push('/employer/jobs')
        return
      }
      
      // Redirect if job is deleted (deleted jobs are no longer accessible)
      if (jobData.status === 'deleted') {
        router.push('/employer/jobs')
        return
      }
      
      setEmployerProfile(profile)
      setJob(jobData)
      
      // Populate form with job data
      setFormData({
        title: jobData.title || '',
        description: jobData.description || '',
        work_type: jobData.work_type || 'construction',
        years_of_experience: jobData.years_of_experience || 0,
        salary_range: jobData.salary_range || '1500_2000',
        language_requirements: jobData.language_requirements || [],
        start_date: jobData.start_date || '',
        end_date: jobData.end_date || '',
        job_type: jobData.job_type || 'permanent',
        accommodation_included: jobData.accommodation_included || false,
        food_included: jobData.food_included || false,
        location_city: jobData.location_city || '',
        location_country: jobData.location_country || '',
        location_address: jobData.location_address || '',
        positions_available: jobData.positions_available || 1,
      })
      
      // Build location display value
      const parts = []
      if (jobData.location_address) parts.push(jobData.location_address)
      else if (jobData.location_city) parts.push(jobData.location_city)
      if (jobData.location_country && !parts.join('').includes(jobData.location_country)) {
        parts.push(jobData.location_country)
      }
      setLocationDisplayValue(parts.join(', '))
      
      setLoading(false)
    }
    
    if (!authLoading && user) {
      loadData()
    }
  }, [user, authLoading, jobId, router])

  const updateField = <K extends keyof typeof formData>(key: K, value: typeof formData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

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

  const inputClasses = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 text-base"
  const labelClasses = "block text-sm font-semibold text-slate-700 mb-2"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving || !user || !employerProfile || !job) return
    
    setSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Validate required fields
      if (!formData.title?.trim()) {
        setError('Please enter a job title.')
        setSaving(false)
        return
      }
      
      if (!formData.description?.trim()) {
        setError('Please enter a job description.')
        setSaving(false)
        return
      }
      
      if (!formData.start_date) {
        setError('Please select a start date.')
        setSaving(false)
        return
      }
      
      if (!formData.location_city?.trim()) {
        setError('Please enter a city.')
        setSaving(false)
        return
      }
      
      if (!formData.location_country?.trim()) {
        setError('Please select a country.')
        setSaving(false)
        return
      }
      
      if (!formData.salary_range) {
        setError('Please select a salary range.')
        setSaving(false)
        return
      }
      
      const updates = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        work_type: formData.work_type,
        years_of_experience: formData.years_of_experience,
        salary_range: formData.salary_range,
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
      }
      
      const updatedJob = await updateJobPosting(job.id, updates)
      if (updatedJob) {
        setJob({ ...job, ...updatedJob })
        setSuccess('Job updated successfully!')
        setIsEditing(false)
      } else {
        setError('Failed to update job posting. Please try again.')
      }
    } catch (err) {
      logError('JobDetails', err, undefined, 'Error updating job')
      setError('Failed to update job posting. Please try again.')
    }
    
    setSaving(false)
  }

  const handleCancelEdit = () => {
    if (!job) return
    
    // Reset form to original job data
    setFormData({
      title: job.title || '',
      description: job.description || '',
      work_type: job.work_type || 'construction',
      years_of_experience: job.years_of_experience || 0,
      salary_range: job.salary_range || '1500_2000',
      language_requirements: job.language_requirements || [],
      start_date: job.start_date || '',
      end_date: job.end_date || '',
      job_type: job.job_type || 'permanent',
      accommodation_included: job.accommodation_included || false,
      food_included: job.food_included || false,
      location_city: job.location_city || '',
      location_country: job.location_country || '',
      location_address: job.location_address || '',
      positions_available: job.positions_available || 1,
    })
    
    setError(null)
    setIsEditing(false)
  }

  const handleDeactivate = async () => {
    if (!job) return
    
    if (!confirm(t('confirm_deactivate_job') || 'Are you sure you want to deactivate this job? It will no longer be visible to workers, but you can reopen it later.')) {
      return
    }
    
    setDeactivating(true)
    setError(null)
    
    const result = await deactivateJobPosting(job.id)
    
    if (result.success) {
      router.push('/employer/jobs')
    } else {
      setError(result.error || 'Failed to deactivate job posting')
    }
    
    setDeactivating(false)
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

  if (!job) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center">
          <p className="text-slate-500">{t('job_not_found') || 'Job not found'}</p>
          <Link href="/employer/jobs" className="text-blue-600 hover:underline mt-2 inline-block">
            {t('go_back_to_jobs') || 'Go back to jobs'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" data-testid="job-details-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/employer/jobs')}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('go_back_to_jobs') || 'Back to Jobs'}
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-500/25">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                  {isEditing ? (t('edit_job') || 'Edit Job') : job.title}
                </h1>
                <p className="text-slate-500 text-sm">
                  {isEditing 
                    ? (t('update_job_details') || 'Update the details for this job posting')
                    : job.company_name
                  }
                </p>
              </div>
            </div>
            
            {!isEditing && job.status === 'active' && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                data-testid="edit-job-button"
              >
                <Pencil className="w-4 h-4" />
                {t('edit') || 'Edit'}
              </button>
            )}
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2" role="alert">
            <Check className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm" role="alert">
            {error}
          </div>
        )}

        {/* Quick Actions */}
        {!isEditing && (
          <div className="mb-6 flex flex-wrap gap-3">
            <Link
              href={`/employer/jobs/${job.id}/applications`}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors"
              data-testid="view-applications-link"
            >
              <Users className="w-4 h-4" />
              {t('view_applications') || 'View Applications'}
            </Link>
            
            {job.status === 'active' && (
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="flex items-center gap-2 px-4 py-2 text-amber-600 font-medium rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="deactivate-job-button"
              >
                {deactivating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                    {t('deactivating') || 'Deactivating...'}
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" />
                    {t('deactivate') || 'Deactivate'}
                  </>
                )}
              </button>
            )}
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
                  disabled={!isEditing || saving}
                  placeholder="e.g., Construction Worker, Kitchen Helper"
                  className={inputClasses}
                  data-testid="job-title-input"
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
                  disabled={!isEditing || saving}
                  placeholder="Describe the job responsibilities, requirements, and what makes this position attractive..."
                  className={inputClasses + " resize-none"}
                  data-testid="job-description-input"
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
                    disabled={!isEditing || saving}
                    data-testid="job-work-type-select"
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
                    disabled={!isEditing || saving}
                    data-testid="job-years-experience-select"
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
                  disabled={!isEditing || saving}
                  data-testid="job-job-type-select"
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
                      value={formData.start_date}
                      onChange={(e) => updateField('start_date', e.target.value)}
                      className={inputClasses + " pl-12"}
                      disabled={!isEditing || saving}
                      data-testid="job-start-date-input"
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
                      value={formData.end_date}
                      onChange={(e) => updateField('end_date', e.target.value)}
                      className={inputClasses + " pl-12"}
                      disabled={!isEditing || saving}
                      data-testid="job-end-date-input"
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
              {isEditing ? (
                <>
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
                      disabled={saving}
                      placeholder={t('location_placeholder') || 'Enter city, address, or location...'}
                      data-testid="job-location-input"
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
                </>
              ) : (
                <div className="text-slate-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>
                      {formData.location_city}
                      {formData.location_country && `, ${formData.location_country}`}
                    </span>
                  </div>
                  {formData.location_address && (
                    <p className="text-sm text-slate-500 mt-1 ml-6">{formData.location_address}</p>
                  )}
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
                  className={`flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-all duration-200 text-2xl ${
                    isEditing ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    formData.language_requirements.includes(lang)
                      ? 'bg-blue-50 border-blue-500 shadow-md scale-110'
                      : 'bg-slate-50 border-slate-200'
                  } ${isEditing && !formData.language_requirements.includes(lang) ? 'hover:border-slate-300 hover:scale-105' : ''}`}
                  data-testid={`job-language-${lang}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.language_requirements.includes(lang)}
                    onChange={() => {
                      if (!isEditing) return
                      const langs = formData.language_requirements.includes(lang)
                        ? formData.language_requirements.filter(l => l !== lang)
                        : [...formData.language_requirements, lang]
                      updateField('language_requirements', langs)
                    }}
                    disabled={!isEditing || saving}
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
                disabled={!isEditing || saving}
                data-testid="job-salary-range-select"
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
              {isEditing && <p className="text-sm text-slate-500 mt-1">{t('salary_range_note')}</p>}
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
              {isEditing ? (
                <>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateField('positions_available', Math.max(1, formData.positions_available - 1))}
                      disabled={saving || formData.positions_available <= 1}
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
                      className="w-24 text-center px-3 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all duration-200 text-lg font-semibold"
                      disabled={saving}
                      data-testid="job-positions-available-input"
                    />
                    <button
                      type="button"
                      onClick={() => updateField('positions_available', Math.min(100, formData.positions_available + 1))}
                      disabled={saving || formData.positions_available >= 100}
                      className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xl font-bold text-slate-600"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">{t('positions_available_note')}</p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="text-xl font-semibold">{job.positions_filled}</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-xl font-semibold">{formData.positions_available}</span>
                  <span className="text-sm text-slate-500 ml-2">{t('positions_filled_of') || 'positions filled'}</span>
                </div>
              )}
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
                className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                  isEditing ? 'cursor-pointer' : 'cursor-default'
                } ${
                  formData.accommodation_included
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                } ${isEditing && !formData.accommodation_included ? 'hover:border-slate-300' : ''}`}
                data-testid="job-accommodation-label"
              >
                <input
                  type="checkbox"
                  name="accommodation_included"
                  checked={formData.accommodation_included}
                  onChange={(e) => isEditing && updateField('accommodation_included', e.target.checked)}
                  disabled={!isEditing || saving}
                  className="sr-only"
                  data-testid="job-accommodation-checkbox"
                />
                <Home className={`w-5 h-5 ${formData.accommodation_included ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="font-medium">{t('accommodation_included')}</span>
              </label>
              
              <label 
                className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                  isEditing ? 'cursor-pointer' : 'cursor-default'
                } ${
                  formData.food_included
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                } ${isEditing && !formData.food_included ? 'hover:border-slate-300' : ''}`}
              >
                <input
                  type="checkbox"
                  name="food_included"
                  checked={formData.food_included}
                  onChange={(e) => isEditing && updateField('food_included', e.target.checked)}
                  disabled={!isEditing || saving}
                  className="sr-only"
                  data-testid="job-food-checkbox"
                />
                <Utensils className={`w-5 h-5 ${formData.food_included ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="font-medium">{t('food_included')}</span>
              </label>
            </div>
          </div>
          
          {/* Action Buttons - Only show when editing */}
          {isEditing && (
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
                data-testid="save-job-button"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('saving') || 'Saving...'}
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {t('save_changes') || 'Save Changes'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-8 py-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                {t('cancel')}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

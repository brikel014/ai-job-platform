'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import type { TranslationKey } from '@/lib/i18n'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/Button'
import { StepIndicator } from '@/components/shared/StepIndicator'
import { WORKER_STEPS } from './stepConfig'
import { useWorkerProfileForm } from './hooks/useWorkerProfileForm'
import { Step1PersonalInfo } from './components/Step1PersonalInfo'
import { Step2Sectors } from './components/Step2Sectors'
import { Step3Availability } from './components/Step3Availability'
import { Step4WorkAuthorization } from './components/Step4WorkAuthorization'
import { Step5Bio } from './components/Step5Bio'
import { SuccessScreen } from './components/SuccessScreen'
import { Alert } from '@/components/ui/Alert'
import { User, Briefcase, Calendar, FileCheck, FileText, ArrowLeft, ArrowRight, Save, X } from 'lucide-react'

const TOOLTIP_DISMISSED_KEY = 'profile_tooltip_dismissed'

// Section icons for update flow
const sectionIcons = {
  personal: User,
  sectors: Briefcase,
  availability: Calendar,
  authorization: FileCheck,
  bio: FileText,
}

export default function WorkerProfilePage() {
  const { user, role, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const { state, actions, loading } = useWorkerProfileForm()

  // Scroll to top when page loads and clear tooltip dismissed flag
  useEffect(() => {
    window.scrollTo(0, 0)
    // Clear the tooltip dismissed flag so it can show again if user leaves without completing
    localStorage.removeItem(TOOLTIP_DISMISSED_KEY)
  }, [])

  // Redirect if not authenticated or not a worker
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    // Redirect employers to their own profile page
    if (!authLoading && user && role === 'employer') {
      router.push('/employer/profile')
      return
    }
  }, [user, role, authLoading, router])

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500">Loading...</span>
          </div>
        </div>
      </>
    )
  }

  // Don't render if not authenticated or wrong role (will redirect in useEffect)
  if (!user || role === 'employer') {
    return null
  }

  // Determine if we're creating or updating
  const isCreating = !state.profile || !state.profile.full_name || state.successScreen
  const isUpdating = !!state.profile && !!state.profile.full_name && !state.successScreen

  // Step-based creation flow
  const renderCreationFlow = () => {
    if (state.successScreen) {
      return <SuccessScreen />
    }

    return (
      <form onSubmit={actions.handleSubmit} className="space-y-3 sm:space-y-5">
        {/* Step Indicator */}
        <StepIndicator
          steps={WORKER_STEPS.map((step) => ({
            id: step.id,
            label: t(step.label as TranslationKey),
            description: state.currentStep === step.id ? t(step.description as TranslationKey) : '',
          }))}
          currentStep={state.currentStep}
        />

        {/* Step Content */}
        <div className="bg-white border border-slate-100 rounded-xl sm:rounded-2xl shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all duration-500 p-3 sm:p-5 md:p-6">
          <div key={state.currentStep} className="step-content-transition">
            {state.currentStep === 1 && (
              <Step1PersonalInfo
                formData={state.formData}
                errors={state.errors}
                onFieldChange={actions.handleFieldChange}
              />
            )}
            {state.currentStep === 2 && (
              <Step2Sectors
                formData={state.formData}
                errors={state.errors}
                onFieldChange={actions.handleFieldChange}
              />
            )}
            {state.currentStep === 3 && (
              <Step3Availability
                formData={state.formData}
                errors={state.errors}
                onFieldChange={actions.handleFieldChange}
              />
            )}
            {state.currentStep === 4 && (
              <Step4WorkAuthorization
                formData={state.formData}
                errors={state.errors}
                onFieldChange={actions.handleFieldChange}
              />
            )}
            {state.currentStep === 5 && (
              <Step5Bio
                formData={state.formData}
                errors={state.errors}
                onFieldChange={actions.handleFieldChange}
              />
            )}
          </div>

          {/* Required fields note - inside card */}
          <p className="text-xs text-slate-400 mt-2">
            {t('required_fields')}
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-2 sm:gap-4">
          {state.currentStep > 1 ? (
            <button 
              type="button" 
              onClick={actions.goBack} 
              data-testid="profile-back-button"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 text-slate-600 hover:text-slate-800 font-medium rounded-lg sm:rounded-xl border-2 border-slate-200 hover:border-blue-200 transition-all text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">{t('back')}</span>
            </button>
          ) : (
            <div />
          )}

          <button 
            type="submit" 
            disabled={state.saving} 
            data-testid={state.currentStep < WORKER_STEPS.length ? "profile-next-button" : "profile-finish-button"}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {state.saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                <span className="hidden sm:inline">{t('saving' as any) || 'Saving...'}</span>
              </>
            ) : state.currentStep < WORKER_STEPS.length ? (
              <>
                {t('next')}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </>
            ) : (
              <>
                <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                {t('finish')}
              </>
            )}
          </button>
        </div>
      </form>
    )
  }

  // Single-page update flow
  const renderUpdateFlow = () => {
    const PersonalIcon = sectionIcons.personal
    const SectorsIcon = sectionIcons.sectors
    const AvailabilityIcon = sectionIcons.availability
    const AuthorizationIcon = sectionIcons.authorization
    const BioIcon = sectionIcons.bio

    return (
      <form onSubmit={actions.handleSubmit} className="space-y-6">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-8">
          {/* Personal Info */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <PersonalIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t('personal_information')}
            </h2>
            </div>
            <Step1PersonalInfo
              formData={state.formData}
              errors={state.errors}
              onFieldChange={actions.handleFieldChange}
            />
          </div>

          <hr className="border-slate-100" />

          {/* Sectors & Experience */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <SectorsIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t('sectors_experience')}
            </h2>
            </div>
            <Step2Sectors
              formData={state.formData}
              errors={state.errors}
              onFieldChange={actions.handleFieldChange}
            />
          </div>

          <hr className="border-slate-100" />

          {/* Availability & Preferences */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <AvailabilityIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t('availability_preferences')}
            </h2>
            </div>
            <Step3Availability
              formData={state.formData}
              errors={state.errors}
              onFieldChange={actions.handleFieldChange}
            />
          </div>

          <hr className="border-slate-100" />

          {/* Work Authorization */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <AuthorizationIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t('work_authorization' as any) || 'Work Authorization'}
            </h2>
            </div>
            <Step4WorkAuthorization
              formData={state.formData}
              errors={state.errors}
              onFieldChange={actions.handleFieldChange}
            />
          </div>

          <hr className="border-slate-100" />

          {/* Bio */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BioIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t('about_you')}
            </h2>
            </div>
            <Step5Bio
              formData={state.formData}
              errors={state.errors}
              onFieldChange={actions.handleFieldChange}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button 
            type="submit" 
            disabled={state.saving} 
            data-testid="profile-save-button"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {t('saving' as any) || 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {t('save_changes')}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push('/worker/view-profile')}
            className="flex items-center justify-center gap-2 px-6 py-4 text-slate-600 hover:text-slate-800 font-medium rounded-xl border-2 border-slate-200 hover:border-blue-200 transition-all"
          >
            <X className="w-5 h-5" />
            {t('cancel')}
          </button>
        </div>
      </form>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 px-2 pt-2 pb-20 sm:p-4 md:p-6 lg:p-8 md:pb-8 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-200/30 via-blue-100/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-100/30 via-purple-50/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-t from-blue-100/20 to-transparent rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-4xl mx-auto">
          {state.message && (
            <div className="mb-6">
            <Alert
              type={state.message.type}
              message={state.message.text}
              onClose={() => actions.handleFieldChange('full_name', state.formData.full_name)}
            />
            </div>
          )}

          {/* Header - compact on mobile - only show on step 1 with smooth transition */}
          {isCreating && !state.successScreen && (
            <div 
              className={`text-center overflow-hidden transition-all duration-700 ease-in-out ${
                state.currentStep === 1 
                  ? 'max-h-32 opacity-100 mb-4 sm:mb-6' 
                  : 'max-h-0 opacity-0 mb-0'
              }`}
            >
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-1.5 sm:mb-2">
                {t('create_profile')}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto px-2">
                {t('complete_profile_description')}
              </p>
            </div>
          )}

          {isUpdating && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold mb-4 border border-blue-100">
                <User className="w-4 h-4" />
                {t('edit_profile')}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              {t('edit_profile')}
            </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto">
                {t('update_profile_description')}
              </p>
            </div>
          )}

          {isCreating ? renderCreationFlow() : renderUpdateFlow()}
        </div>
      </div>
    </>
  )
}

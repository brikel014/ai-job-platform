'use client'

/**
 * Employer Profile Page
 * 
 * This page allows employers to create and update their company profile.
 * It supports two flows:
 * 1. Creation flow - Multi-step wizard for new profiles
 * 2. Update flow - Single page with all sections for existing profiles
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/useLanguage'
import { useAuth } from '@/lib/auth'
import { StepIndicator } from '@/components/shared/StepIndicator'
import { Alert } from '@/components/ui/Alert'
import { EMPLOYER_STEPS } from './stepConfig'
import { useEmployerProfileForm } from './hooks/useEmployerProfileForm'
import { Step1CompanyName } from './components/Step1CompanyName'
import { Step2Location } from './components/Step2Location'
import { Step3AdditionalInfo } from './components/Step3AdditionalInfo'
import { SuccessScreen } from './components/SuccessScreen'
import { Building2, MapPin, Info, ArrowLeft, ArrowRight, Save, X } from 'lucide-react'

// Section icons for update flow - maps section to appropriate icon
const sectionIcons = {
  company: Building2,
  location: MapPin,
  additional: Info,
}

export default function EmployerProfilePage() {
  const { user, role, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const { state, actions, loading } = useEmployerProfileForm()

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [state.currentStep])

  // Auth is handled by the employer layout

  const { currentStep, successScreen, saving, message, errors, formData } = state
  const { handleFieldChange, goBack, handleSubmit } = actions

  // Determine if we're creating or updating
  const isCreating = !state.profile || !state.profile.company_name || state.successScreen
  const isUpdating = !!state.profile && state.profile.company_name && !state.successScreen

  // Translate steps for display
  const translatedSteps = EMPLOYER_STEPS.map((step) => ({
    ...step,
    label: t(`employer_step${step.id}_label` as any),
    description: currentStep === step.id ? t(`employer_step${step.id}_desc` as any) : '',
  }))

  // Loading state with spinner animation
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-sm font-medium text-slate-500">Loading...</span>
        </div>
      </div>
    )
  }

  /**
   * Renders the step content based on current step
   * Used in the creation flow wizard
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1CompanyName
            formData={formData}
            errors={errors}
            onFieldChange={handleFieldChange}
          />
        )
      case 2:
        return (
          <Step2Location
            formData={formData}
            errors={errors}
            onFieldChange={handleFieldChange}
          />
        )
      case 3:
        return (
          <Step3AdditionalInfo
            formData={formData}
            errors={errors}
            onFieldChange={handleFieldChange}
          />
        )
      default:
        return null
    }
  }

  /**
   * Multi-step creation flow for new employer profiles
   * Shows step indicator and navigation buttons
   */
  const renderCreationFlow = () => {
    if (successScreen && message?.type === 'success') {
      return <SuccessScreen />
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step Indicator */}
        <StepIndicator steps={translatedSteps} currentStep={currentStep} />

        {/* Step Content */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-shadow p-4 sm:p-6">
          {renderStepContent()}
          
          {/* Required fields note - inside card */}
          <p className="text-xs text-slate-400 mt-2">
            {t('required_fields')}
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-2 sm:gap-4">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={goBack}
              data-testid="employer-profile-back-button"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-slate-600 hover:text-slate-800 font-medium rounded-xl border-2 border-slate-200 hover:border-blue-200 transition-all"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="whitespace-nowrap">{t('back')}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={saving}
            data-testid={currentStep < EMPLOYER_STEPS.length ? "employer-profile-next-button" : "employer-profile-finish-button"}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                <span className="whitespace-nowrap">{t('saving' as any) || 'Saving...'}</span>
              </>
            ) : currentStep < EMPLOYER_STEPS.length ? (
              <>
                <span className="whitespace-nowrap">{t('next')}</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </>
            ) : (
              <>
                <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="whitespace-nowrap">{t('finish')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    )
  }

  /**
   * Single-page update flow for existing employer profiles
   * Shows all sections with icons in a single scrollable view
   */
  const renderUpdateFlow = () => {
    const CompanyIcon = sectionIcons.company
    const LocationIcon = sectionIcons.location
    const AdditionalIcon = sectionIcons.additional

    return (
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
          {/* Company Name Section */}
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                <CompanyIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
                {t('employer_step1_label' as any)}
              </h2>
            </div>
            <Step1CompanyName
              formData={formData}
              errors={errors}
              onFieldChange={handleFieldChange}
            />
          </div>

          <hr className="border-slate-100" />

          {/* Location Section */}
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                <LocationIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
                {t('employer_step2_label' as any)}
              </h2>
            </div>
            <Step2Location
              formData={formData}
              errors={errors}
              onFieldChange={handleFieldChange}
            />
          </div>

          <hr className="border-slate-100" />

          {/* Additional Information Section */}
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                <AdditionalIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
                {t('employer_step3_label' as any)}
              </h2>
            </div>
            <Step3AdditionalInfo
              formData={formData}
              errors={errors}
              onFieldChange={handleFieldChange}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button
            type="submit"
            disabled={saving}
            data-testid="employer-profile-save-button"
            className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                <span className="whitespace-nowrap">{t('saving' as any) || 'Saving...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="whitespace-nowrap">{t('save_changes')}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push('/employer/view-profile')}
            data-testid="employer-profile-cancel-button"
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base text-slate-600 hover:text-slate-800 font-medium rounded-xl border-2 border-slate-200 hover:border-blue-200 transition-all"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="whitespace-nowrap">{t('cancel')}</span>
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 p-2 sm:p-4 md:p-6 lg:p-8 relative overflow-x-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-200/30 via-blue-100/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-100/30 via-purple-50/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-t from-blue-100/20 to-transparent rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-4xl mx-auto w-full">
        {/* Alert Messages */}
        {message && (
          <div className="mb-6">
            <Alert
              type={message.type}
              message={message.text}
              onClose={() => handleFieldChange('company_name', formData.company_name)}
            />
          </div>
        )}

        {/* Header for Creation Flow */}
        {isCreating && !successScreen && (
          <div className="text-center mb-6 sm:mb-8 px-2">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-semibold mb-3 sm:mb-4 border border-blue-100">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
              {t('create_profile')}
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2 sm:mb-3 px-2">
              {t('create_employer_profile' as any) || t('create_profile')}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-xl mx-auto px-2">
              {t('complete_employer_profile_description' as any) || t('complete_profile_description')}
            </p>
          </div>
        )}

        {/* Header for Update Flow */}
        {isUpdating && (
          <div className="text-center mb-6 sm:mb-8 px-2">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-semibold mb-3 sm:mb-4 border border-blue-100">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
              {t('edit_profile')}
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2 sm:mb-3 px-2">
              {t('edit_profile')}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-xl mx-auto px-2">
              {t('update_employer_profile_description' as any) || t('update_profile_description')}
            </p>
          </div>
        )}

        {isCreating ? renderCreationFlow() : renderUpdateFlow()}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { getWorkerProfile, createWorkerProfile, updateWorkerProfile } from '@/lib/db'
import { validateWorkerField, validateWorkerStep } from '@/lib/validation/workerProfile'
import { logError } from '@/lib/logger'
import { track } from '@/lib/analytics'
import { WORKER_STEPS, EMPTY_WORKER_FORM } from '../stepConfig'
import type { FormState, FormActions, WorkerProfileFormState } from '../types'
import type { WorkAuthorization } from '@/lib/types'
import type { WorkerStepField } from '../stepConfig'

export const useWorkerProfileForm = () => {
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  // Form state
  const [state, setState] = useState<FormState>({
    currentStep: 1,
    successScreen: false,
    saving: false,
    message: null,
    errors: {},
    formData: EMPTY_WORKER_FORM as WorkerProfileFormState,
    profile: null,
  })
  const [loading, setLoading] = useState(true)

  // Load profile on mount
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    // Don't reload if success screen is showing (to keep it stable)
    if (state.successScreen) {
      return
    }

    if (user) {
      loadProfile()
    }
  }, [user, authLoading, state.successScreen])

  // Track which onboarding step the user reaches (create flow only) so we can
  // see where people drop off mid-signup.
  useEffect(() => {
    if (state.profile) return // editing an existing profile, not onboarding
    const step = WORKER_STEPS.find((s) => s.id === state.currentStep)
    track('profile_step_viewed', {
      role: 'worker',
      step: state.currentStep,
      step_label: step?.label,
      total_steps: WORKER_STEPS.length,
    })
  }, [state.currentStep, state.profile])

  const loadProfile = async () => {
    if (!user) return

    setLoading(true)
    const existingProfile = await getWorkerProfile(user.id)

    // Only treat as existing profile if it has required fields
    // This prevents showing update flow for incomplete/broken profiles
    if (existingProfile && existingProfile.full_name) {
      setState((prev) => ({
        ...prev,
        profile: existingProfile,
        formData: {
          full_name: existingProfile.full_name || '',
          date_of_birth: existingProfile.date_of_birth || '',
          nationality: existingProfile.nationality || '',
          profile_image_url: existingProfile.profile_image_url || '',
          languages: existingProfile.languages || [],
          work_types: existingProfile.work_types || [],
          certifications: existingProfile.certifications || [],
          available_immediately: existingProfile.available_immediately || false,
          preferred_locations: existingProfile.preferred_locations || [],
          work_authorization: existingProfile.work_authorization || null,
          bio: existingProfile.bio || '',
          experience: existingProfile.experience || '',
        },
      }))
    } else {
      // No profile or incomplete profile - show creation flow
      setState((prev) => ({
        ...prev,
        profile: null, // Ensure profile is null for creation flow
      }))
    }
    setLoading(false)
  }

  const handleFieldChange = (field: WorkerStepField, value: string | string[] | WorkAuthorization | null | boolean) => {
    setState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value,
      },
      errors: {
        ...prev.errors,
        [field]: undefined,
      },
      message: null,
    }))

    // Real-time validation (skip for work_authorization as it's an object)
    if (field !== 'work_authorization') {
    const error = validateWorkerField(field, value as string | string[])
    if (error) {
      setState((prev) => ({
        ...prev,
        errors: {
          ...prev.errors,
          [field]: error,
        },
      }))
      }
    }
  }

  const goNext = () => {
    // Validate current step
    const currentStepConfig = WORKER_STEPS.find((s) => s.id === state.currentStep)
    if (!currentStepConfig) return

    const stepErrors = validateWorkerStep(state.formData, currentStepConfig.fields)
    if (Object.keys(stepErrors).length > 0) {
      setState((prev) => ({
        ...prev,
        errors: stepErrors,
        message: { type: 'error', text: 'Please fix the errors before continuing' },
      }))
      return
    }

    // Move to next step
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, WORKER_STEPS.length),
      errors: {},
      message: null,
    }))

    // Scroll to top of page for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
      message: null,
    }))

    // Scroll to top of page for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Build profile payload helper (no email/phone - these come from auth.users)
    const buildProfilePayload = () => ({
      id: user!.id, // id = auth.uid()
      full_name: state.formData.full_name,
      date_of_birth: state.formData.date_of_birth || undefined,
      nationality: state.formData.nationality || undefined,
      profile_image_url: state.formData.profile_image_url || undefined,
      languages: state.formData.languages,
      work_types: state.formData.work_types,
      certifications: state.formData.certifications,
      available_immediately: state.formData.available_immediately || undefined,
      preferred_locations: state.formData.preferred_locations,
      work_authorization: state.formData.work_authorization || undefined,
      bio: state.formData.bio || undefined,
      experience: state.formData.experience || undefined,
    })

    // For UPDATE flow (existing profile): validate and submit immediately
    if (state.profile) {
      // Validate all steps
      for (let step = 1; step <= WORKER_STEPS.length; step++) {
        const stepConfig = WORKER_STEPS.find((s) => s.id === step)
        if (!stepConfig) continue
        
        const stepErrors = validateWorkerStep(state.formData, stepConfig.fields)
        if (Object.keys(stepErrors).length > 0) {
          setState((prev) => ({
            ...prev,
            errors: stepErrors,
            message: { type: 'error', text: t('fill_required_fields') },
          }))
          return
        }
      }
      
      if (!user) return

      setState((prev) => ({ ...prev, saving: true }))

      try {
        const profileData = buildProfilePayload()
        const success = await updateWorkerProfile(user.id, profileData)
        
        if (success) {
          setState((prev) => ({
            ...prev,
            saving: false,
          }))
          // Redirect to view profile with success query param to show banner there
          router.push('/worker/view-profile?updated=true')
        } else {
          setState((prev) => ({
            ...prev,
            saving: false,
            message: { type: 'error', text: t('failed_to_update_profile') },
          }))
        }
      } catch (error) {
        logError('useWorkerProfileForm.handleSubmit', error, { formData: state.formData })
        setState((prev) => ({
          ...prev,
          saving: false,
          message: { type: 'error', text: t('unexpected_error') },
        }))
      }
      return
    }

    // For CREATE flow (new profile): go through steps
    if (state.currentStep < WORKER_STEPS.length) {
      goNext()
      return
    }

    // Validate final step before submission
    const currentStepConfig = WORKER_STEPS.find((s) => s.id === state.currentStep)
    if (!currentStepConfig) return

    const stepErrors = validateWorkerStep(state.formData, currentStepConfig.fields)
    if (Object.keys(stepErrors).length > 0) {
      setState((prev) => ({
        ...prev,
        errors: stepErrors,
        message: { type: 'error', text: 'Please fix the errors before submitting' },
      }))
      return
    }

    if (!user) return

    setState((prev) => ({ ...prev, saving: true }))

    try {
      const profileData = buildProfilePayload()

        // Create new profile
        const newProfile = await createWorkerProfile(profileData)
        if (newProfile) {
          track('profile_created', { role: 'worker' })
          setState((prev) => ({
            ...prev,
            saving: false,
            successScreen: true,
            profile: newProfile,
          }))
        } else {
          setState((prev) => ({
            ...prev,
            saving: false,
            message: { type: 'error', text: t('failed_to_create_profile') },
          }))
      }
    } catch (error) {
      logError('useWorkerProfileForm.handleSubmit', error, { formData: state.formData })
      setState((prev) => ({
        ...prev,
        saving: false,
        message: { type: 'error', text: 'An unexpected error occurred' },
      }))
    }
  }

  const actions: FormActions = {
    handleFieldChange,
    goNext,
    goBack,
    handleSubmit,
  }

  return { state, actions, loading }
}


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { getEmployerProfile, createEmployerProfile, updateEmployerProfile } from '@/lib/db'
import { validateEmployerField, validateEmployerStep } from '@/lib/validation/employerProfile'
import { EMPLOYER_STEPS, EMPTY_EMPLOYER_FORM } from '../stepConfig'
import { buildProfilePayload } from '../utils/profilePayloadBuilder'
import { track } from '@/lib/analytics'
import type { FormState, FormActions, EmployerProfileFormState } from '../types'
import type { EmployerStepField } from '../stepConfig'

export const useEmployerProfileForm = () => {
  const { user, role, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  // Form state
  const [state, setState] = useState<FormState>({
    currentStep: 1,
    successScreen: false,
    saving: false,
    message: null,
    errors: {},
    formData: EMPTY_EMPLOYER_FORM,
    profile: null,
  })
  const [loading, setLoading] = useState(true)

  // Load profile on mount - with role protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    // Redirect workers - they cannot create employer profiles
    if (!authLoading && user && role === 'worker') {
      router.push('/worker/profile')
      return
    }

    if (user && role === 'employer') {
      loadProfile()
    }
  }, [user, role, authLoading])

  // Track which onboarding step the user reaches (create flow only) so we can
  // see where people drop off mid-signup.
  useEffect(() => {
    if (state.profile) return // editing an existing profile, not onboarding
    const step = EMPLOYER_STEPS.find((s) => s.id === state.currentStep)
    track('profile_step_viewed', {
      role: 'employer',
      step: state.currentStep,
      step_label: step?.label,
      total_steps: EMPLOYER_STEPS.length,
    })
  }, [state.currentStep, state.profile])

  const loadProfile = async () => {
    if (!user) return

    setLoading(true)
    const existingProfile = await getEmployerProfile(user.id)

    if (existingProfile) {
      setState((prev) => ({
        ...prev,
        profile: existingProfile,
        formData: {
          ...EMPTY_EMPLOYER_FORM,
          company_name: existingProfile.company_name || '',
          industry: existingProfile.industry || '',
          email: user.email || '', // Read-only from auth
          phone: user.phone || '', // Read-only from auth
          city: existingProfile.city || '',
          country: existingProfile.country || '',
          address: existingProfile.address || '',
          website: existingProfile.website || '',
          description: existingProfile.description || '',
          profile_image_url: existingProfile.profile_image_url || '',
        },
      }))
    } else {
      // Email/phone are read-only from auth.users
      setState((prev) => ({
        ...prev,
        formData: { 
          ...prev.formData, 
          email: user.email || '',
          phone: user.phone || '',
        },
      }))
    }
    setLoading(false)
  }

  const handleFieldChange = (field: keyof EmployerProfileFormState, value: string) => {
    setState((prev) => ({
      ...prev,
      successScreen: false,
      message: null,
      formData: { ...prev.formData, [field]: value },
      errors: prev.errors[field]
        ? { ...prev.errors, [field]: validateEmployerField(field as EmployerStepField, value) || undefined }
        : prev.errors,
    }))
  }

  /**
   * Validates the specified step's fields and returns validation result.
   * Does NOT set errors in state - caller decides how to handle errors.
   */
  const getStepValidationErrors = (step: number): Partial<Record<keyof EmployerProfileFormState, string>> => {
    const stepDef = EMPLOYER_STEPS.find((s) => s.id === step)
    if (!stepDef) return {}
    return validateEmployerStep(state.formData, stepDef.fields)
  }

  /**
   * Legacy function for backward compatibility - validates step and sets errors.
   * Used by handleSubmit when validation should show errors immediately.
   */
  const validateCurrentStep = (step: number): boolean => {
    const newErrors = getStepValidationErrors(step)
    setState((prev) => ({ ...prev, errors: { ...prev.errors, ...newErrors } }))
    return Object.keys(newErrors).length === 0
  }

  const goNext = () => {
    // Get validation errors for current step WITHOUT setting state
    const stepErrors = getStepValidationErrors(state.currentStep)
    const isValid = Object.keys(stepErrors).length === 0

    if (isValid) {
      // Validation passed - move to next step and clear ALL errors
      setState((prev) => ({
        ...prev,
        currentStep: Math.min(prev.currentStep + 1, EMPLOYER_STEPS.length),
        errors: {},
        message: null,
        successScreen: false,
      }))

      // Scroll to top of page for better UX
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Validation failed - stay on current step and show only current step's errors
      setState((prev) => ({
        ...prev,
        errors: stepErrors,
        message: null,
        successScreen: false,
      }))
    }
  }

  const goBack = () => {
    // Clear errors when navigating back - errors should only show after validation attempts
    setState((prev) => ({ 
      ...prev, 
      currentStep: Math.max(1, prev.currentStep - 1),
      errors: {},
      message: null,
    }))

    // Scroll to top of page for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // For UPDATE flow (existing profile): validate current step and submit immediately
    if (state.profile) {
      // Validate all steps for update
      for (let step = 1; step <= EMPLOYER_STEPS.length; step++) {
        if (!validateCurrentStep(step)) {
          // If validation fails, show which step has errors
          setState((prev) => ({
            ...prev,
            message: { type: 'error', text: 'Please fill in all required fields' },
          }))
          return
        }
      }
      
      if (!user) return

      setState((prev) => ({ ...prev, saving: true }))
      const profileData = buildProfilePayload(state.formData, user.id)
      
      const success = await updateEmployerProfile(user.id, profileData)
      if (success) {
        setState((prev) => ({
          ...prev,
          saving: false,
        }))
        // Redirect to view profile with success query param to show banner there
        router.push('/employer/view-profile?updated=true')
      } else {
        setState((prev) => ({
          ...prev,
          saving: false,
          message: { type: 'error', text: t('failed_to_update_profile') },
        }))
      }
      return
    }

    // For CREATE flow (new profile): go through steps
    if (state.currentStep < EMPLOYER_STEPS.length) {
      goNext()
      return
    }

    // Validate final step before submission
    if (!validateCurrentStep(state.currentStep)) {
      return
    }
    if (!user) {
      return
    }

    setState((prev) => ({ ...prev, saving: true }))

    const profileData = buildProfilePayload(state.formData, user.id)

    // Create new profile
    const newProfile = await createEmployerProfile(profileData)
    if (newProfile) {
      track('profile_created', { role: 'employer' })
      setState((prev) => ({
        ...prev,
        profile: newProfile,
        saving: false,
        message: { type: 'success', text: t('profile_created_successfully') },
        successScreen: true,
      }))
    } else {
      setState((prev) => ({
        ...prev,
        saving: false,
        message: { type: 'error', text: t('failed_to_create_profile') },
      }))
    }
  }

  const actions: FormActions = {
    handleFieldChange,
    goNext,
    goBack,
    handleSubmit,
  }

  return {
    state,
    actions,
    loading: authLoading || loading,
    user,
  }
}


import { WorkerStepField } from './stepConfig'
import type { Language, WorkType, WorkAuthorization } from '@/lib/types'

export interface WorkerProfileFormState {
  full_name: string
  date_of_birth: string
  nationality: string
  profile_image_url: string
  languages: Language[]
  work_types: WorkType[]
  certifications: string[]
  available_immediately: boolean
  preferred_locations: string[]
  work_authorization: WorkAuthorization | null
  bio: string
  experience: string
}

export interface FormState {
  currentStep: number
  successScreen: boolean
  saving: boolean
  message: { type: 'success' | 'error'; text: string } | null
  errors: Partial<Record<WorkerStepField, string>>
  formData: WorkerProfileFormState
  profile: any | null
}

export interface FormActions {
  handleFieldChange: (field: WorkerStepField, value: string | string[] | WorkAuthorization | null | boolean) => void
  goNext: () => void
  goBack: () => void
  handleSubmit: (e: React.FormEvent) => void
}


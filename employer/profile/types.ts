import type { EmployerProfile, WorkType } from '@/lib/types'

export type MessageState = { type: 'success' | 'error'; text: string } | null

export interface EmployerProfileFormState {
  company_name: string
  industry: WorkType | ''  // Required: the industry they are hiring for
  city: string
  country: string
  address: string
  email: string
  phone: string
  website: string
  description: string  // Optional: about the company
  profile_image_url: string
}

export interface FormActions {
  handleFieldChange: (field: keyof EmployerProfileFormState, value: string) => void
  goNext: () => void
  goBack: () => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
}

export interface FormState {
  currentStep: number
  successScreen: boolean
  saving: boolean
  message: MessageState
  errors: Partial<Record<keyof EmployerProfileFormState, string>>
  formData: EmployerProfileFormState
  profile: EmployerProfile | null
}


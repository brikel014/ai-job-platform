import type { EmployerProfileFormState } from './types'

export type EmployerStepField =
  | 'company_name'
  | 'industry'
  | 'city'
  | 'country'
  | 'address'
  | 'email'
  | 'phone'
  | 'website'
  | 'profile_image_url'
  | 'description'

export interface EmployerStep {
  id: number
  label: string
  description: string
  fields: EmployerStepField[]
}

export const EMPLOYER_STEPS: EmployerStep[] = [
  {
    id: 1,
    label: 'Company Name',
    description: 'Enter your company name',
    fields: ['company_name'],
  },
  {
    id: 2,
    label: 'Company Location',
    description: 'City and country (most important)',
    fields: ['city', 'country', 'address'],
  },
  {
    id: 3,
    label: 'Additional Information',
    description: 'Industry and about',
    fields: ['industry', 'description', 'website'],
  },
]

export const EMPTY_EMPLOYER_FORM: EmployerProfileFormState = {
  company_name: '',
  industry: '',
  city: '',
  country: '',
  address: '',
  email: '',
  phone: '',
  website: '',
  profile_image_url: '',
  description: '',
}


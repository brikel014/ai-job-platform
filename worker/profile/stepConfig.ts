export type WorkerStepField =
  | 'full_name'
  | 'date_of_birth'
  | 'nationality'
  | 'profile_image_url'
  | 'languages'
  | 'work_types'
  | 'certifications'
  | 'available_immediately'
  | 'preferred_locations'
  | 'work_authorization'
  | 'bio'
  | 'experience'

export interface WorkerStep {
  id: number
  label: string
  description: string
  fields: WorkerStepField[]
}

export const WORKER_STEPS: WorkerStep[] = [
  {
    id: 1,
    label: 'worker_step1_label',
    description: 'worker_step1_desc',
    fields: ['full_name', 'date_of_birth', 'nationality', 'profile_image_url'],
  },
  {
    id: 2,
    label: 'worker_step2_label',
    description: 'worker_step2_desc',
    fields: ['languages', 'work_types', 'certifications'],
  },
  {
    id: 3,
    label: 'worker_step3_label',
    description: 'worker_step3_desc',
    fields: ['available_immediately', 'preferred_locations'],
  },
  {
    id: 4,
    label: 'worker_step4_label',
    description: 'worker_step4_desc',
    fields: ['work_authorization'],
  },
  {
    id: 5,
    label: 'worker_step5_label',
    description: 'worker_step5_desc',
    fields: ['experience', 'bio'],
  },
]

import type { WorkAuthorization } from '@/lib/types'

export const EMPTY_WORKER_FORM: Record<WorkerStepField, string | string[] | WorkAuthorization | null | boolean> = {
  full_name: '',
  date_of_birth: '',
  nationality: '',
  profile_image_url: '',
  languages: [],
  work_types: [],
  certifications: [],
  available_immediately: false,
  preferred_locations: [],
  work_authorization: null,
  bio: '',
  experience: '',
}


import type { EmployerProfileFormState } from '../types'
import type { WorkType } from '@/lib/types'

/**
 * Build the profile payload for creating/updating an employer profile.
 * Note: email and phone are NOT included - they come from auth.users
 */
export const buildProfilePayload = (
  formData: EmployerProfileFormState,
  userId: string
) => {
  const trim = (v: string) => v.trim()
  const opt = (v: string) => (v.trim() ? v.trim() : '')
  // For optional URL fields, return undefined if empty so they can be cleared
  const optUrl = (v: string) => (v.trim() ? v.trim() : undefined)

  return {
    id: userId, // id = auth.uid()
    company_name: trim(formData.company_name),
    industry: formData.industry as WorkType, // Required - validated before submission
    city: trim(formData.city),
    country: trim(formData.country),
    address: opt(formData.address),
    website: opt(formData.website),
    description: opt(formData.description), // Optional
    profile_image_url: optUrl(formData.profile_image_url), // Company logo
  }
}

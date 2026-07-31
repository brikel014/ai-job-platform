import React from 'react'
import { ProfileImageUpload } from '@/components/ui/ProfileImageUpload'
import { useLanguage } from '@/lib/useLanguage'
import { useAuth } from '@/lib/auth'
import type { EmployerProfileFormState } from '../types'

interface Step1Props {
  formData: EmployerProfileFormState
  errors: Partial<Record<keyof EmployerProfileFormState, string>>
  onFieldChange: (field: keyof EmployerProfileFormState, value: string) => void
}

export const Step1CompanyName: React.FC<Step1Props> = ({ formData, errors, onFieldChange }) => {
  const { t } = useLanguage()
  const { user } = useAuth()

  const handleImageChange = (url: string | null) => {
    onFieldChange('profile_image_url', url || '')
  }

  return (
    <div className="flex items-start gap-2 sm:gap-4">
      {/* Company Logo */}
      {user && (
        <div className="flex-shrink-0">
          <ProfileImageUpload
            userId={user.id}
            currentImageUrl={formData.profile_image_url || null}
            onImageChange={handleImageChange}
            size="sm"
          />
        </div>
      )}

      {/* Company Name */}
      <div className="flex-1 min-w-0 pt-2">
        <label className="block text-base sm:text-lg font-medium text-slate-700 mb-1">
          {t('company_name')} *
        </label>
        <input
          type="text"
          name="company_name"
          data-testid="employer-profile-company-name"
          value={formData.company_name}
          onChange={(e) => onFieldChange('company_name', e.target.value)}
          placeholder={t('company_name')}
          className={`w-full px-3 py-2.5 border rounded-lg text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
            errors.company_name ? 'border-red-300' : 'border-slate-300'
          }`}
        />
        {errors.company_name && (
          <p className="text-sm sm:text-lg text-red-600 mt-1">{t(errors.company_name as any)}</p>
        )}
      </div>
    </div>
  )
}

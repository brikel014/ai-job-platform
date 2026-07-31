import React from 'react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { useLanguage } from '@/lib/useLanguage'
import type { EmployerProfileFormState } from '../types'
import type { WorkType } from '@/lib/types'

interface Step3Props {
  formData: EmployerProfileFormState
  errors: Partial<Record<keyof EmployerProfileFormState, string>>
  onFieldChange: (field: keyof EmployerProfileFormState, value: string) => void
}

const WORK_TYPES: WorkType[] = [
  'construction',
  'manufacturing',
  'logistics_warehousing',
  'agriculture',
  'hospitality_tourism',
  'cleaning_maintenance',
  'care_household',
  'transport_delivery',
  'general_temporary',
  'other',
]

export const Step3AdditionalInfo: React.FC<Step3Props> = ({ formData, errors, onFieldChange }) => {
  const { t } = useLanguage()

  // Create options for the industry select
  const industryOptions = WORK_TYPES.map((type) => ({
    value: type,
    label: t(type as any) || type.replace(/_/g, ' '),
  }))

  return (
    <div className="space-y-4">
      {/* Industry - Required */}
      <div>
        <Select
          label={t('industry')}
          required
          value={formData.industry}
          onChange={(e) => onFieldChange('industry', e.target.value)}
          options={[
            { value: '', label: t('select_industry') || 'Select industry...' },
            ...industryOptions,
          ]}
          data-testid="employer-profile-industry"
        />
        {errors.industry && (
          <p className="text-lg text-red-600 mt-1">{t(errors.industry as any)}</p>
        )}
      </div>

      {/* About Section - Optional */}
      <Textarea
        label={t('about_section_optional') || `${t('about_section')} (${t('optional')})`}
        value={formData.description}
        onChange={(e) => onFieldChange('description', e.target.value)}
        rows={4}
        placeholder={t('about_placeholder')}
        data-testid="employer-profile-description"
      />
      {errors.description && (
        <p className="text-lg text-red-600 mt-1">{t(errors.description as any)}</p>
      )}

      {/* Website - Optional */}
      <Input
        type="url"
        label={t('website_optional')}
        value={formData.website}
        onChange={(e) => onFieldChange('website', e.target.value)}
        placeholder={t('website_placeholder')}
        data-testid="employer-profile-website"
      />
      {errors.website && (
        <p className="text-lg text-red-600 mt-1">{t(errors.website as any)}</p>
      )}
    </div>
  )
}


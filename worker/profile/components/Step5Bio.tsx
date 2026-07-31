import React from 'react'
import { Textarea } from '@/components/ui/Textarea'
import { useLanguage } from '@/lib/useLanguage'
import { FileText } from 'lucide-react'
import type { WorkerProfileFormState } from '../types'
import type { WorkerStepField } from '../stepConfig'

interface Step5Props {
  formData: WorkerProfileFormState
  errors: Partial<Record<WorkerStepField, string>>
  onFieldChange: (field: WorkerStepField, value: string) => void
}

export const Step5Bio: React.FC<Step5Props> = ({ formData, errors, onFieldChange }) => {
  const { t } = useLanguage()

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <FileText className="w-5 h-5 text-amber-600" />
        <label className="text-base lg:text-lg font-medium text-slate-700">
          {t('about_you')}
        </label>
      </div>

      {/* Experience */}
      <div>
        <label className="block text-base lg:text-lg font-medium mb-1.5 text-slate-700">
          {t('work_experience' as any)}
        </label>
        <textarea
          id="experience"
          name="experience"
          value={formData.experience || ''}
          onChange={(e) => onFieldChange('experience', e.target.value)}
          rows={4}
          placeholder={t('work_experience_placeholder' as any)}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
        />
        {errors.experience && (
          <p className="text-sm text-red-600 mt-1">{t(errors.experience as any)}</p>
        )}
      </div>

      {/* Bio */}
      <div>
        <label className="block text-base lg:text-lg font-medium mb-1.5 text-slate-700">
          {t('bio')}
        </label>
        <textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={(e) => onFieldChange('bio', e.target.value)}
          rows={3}
          placeholder={t('tell_employers_about_yourself')}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
        />
        <p className="text-xs text-slate-500 mt-1">{t('tell_employers_about_yourself')}</p>
      </div>
    </div>
  )
}

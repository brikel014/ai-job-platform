import React, { useState, useRef, useEffect } from 'react'
import { ProfileImageUpload } from '@/components/ui/ProfileImageUpload'
import { useLanguage } from '@/lib/useLanguage'
import { useAuth } from '@/lib/auth'
import type { WorkerProfileFormState } from '../types'
import type { WorkerStepField } from '../stepConfig'
import type { Nationality } from '@/lib/types'
import { ChevronDown, Search, Check } from 'lucide-react'
import { FlagIcon } from '@/components/ui/FlagIcon'

interface Step1Props {
  formData: WorkerProfileFormState
  errors: Partial<Record<WorkerStepField, string>>
  onFieldChange: (field: WorkerStepField, value: string) => void
}

// Nationality options with flags
const NATIONALITIES: { code: Nationality; flag: string; labelKey: string }[] = [
  { code: 'rs', flag: '🇷🇸', labelKey: 'nationality_serbia' },
  { code: 'hr', flag: '🇭🇷', labelKey: 'nationality_croatia' },
  { code: 'ba', flag: '🇧🇦', labelKey: 'nationality_bosnia' },
  { code: 'mk', flag: '🇲🇰', labelKey: 'nationality_macedonia' },
  { code: 'si', flag: '🇸🇮', labelKey: 'nationality_slovenia' },
  { code: 'pl', flag: '🇵🇱', labelKey: 'nationality_poland' },
  { code: 'bg', flag: '🇧🇬', labelKey: 'nationality_bulgaria' },
  { code: 'ro', flag: '🇷🇴', labelKey: 'nationality_romania' },
  { code: 'gr', flag: '🇬🇷', labelKey: 'nationality_greece' },
  { code: 'al', flag: '🇦🇱', labelKey: 'nationality_albania' },
  { code: 'de', flag: '🇩🇪', labelKey: 'nationality_germany' },
  { code: 'at', flag: '🇦🇹', labelKey: 'nationality_austria' },
  { code: 'ch', flag: '🇨🇭', labelKey: 'nationality_switzerland' },
  { code: 'me', flag: '🇲🇪', labelKey: 'nationality_montenegro' },
  { code: 'ua', flag: '🇺🇦', labelKey: 'nationality_ukraine' },
]

export const Step1PersonalInfo: React.FC<Step1Props> = ({ formData, errors, onFieldChange }) => {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [isNationalityOpen, setIsNationalityOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNationalityOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedNationality = NATIONALITIES.find(n => n.code === formData.nationality)
  
  const filteredNationalities = NATIONALITIES.filter(nat => {
    const label = t(nat.labelKey as any) || nat.labelKey
    return label.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleImageChange = (url: string | null) => {
    onFieldChange('profile_image_url', url || '')
  }

  return (
    <div className="space-y-3">
      {/* Profile Photo - centered on mobile, inline on larger screens */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
        {user && (
          <div className="flex-shrink-0">
            <ProfileImageUpload
              userId={user.id}
              currentImageUrl={formData.profile_image_url || null}
              onImageChange={handleImageChange}
              size="sm"
              className="[&>p]:hidden sm:[&>p]:block"
            />
          </div>
        )}
        <div className="flex-1 w-full">
          <label className="block text-base lg:text-lg font-medium text-slate-700 mb-1">
            {t('full_name')} *
          </label>
          <input
            type="text"
            name="full_name"
            data-testid="input-full-name"
            value={formData.full_name}
            onChange={(e) => onFieldChange('full_name', e.target.value)}
            placeholder={t('full_name')}
            className={`w-full px-3 py-2.5 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
              errors.full_name ? 'border-red-300' : 'border-slate-300'
            }`}
          />
          {errors.full_name && (
            <p className="text-sm text-red-600 mt-1">{t(errors.full_name as any)}</p>
          )}
        </div>
      </div>

      {/* Row 2: Date of Birth + Nationality (stacked on mobile, side by side on larger) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {/* Date of Birth */}
        <div className="min-w-0">
          <label className="block text-base lg:text-lg font-medium text-slate-700 mb-1">
            {t('date_of_birth')}
          </label>
          <input
            type="date"
            name="date_of_birth"
            data-testid="input-date-of-birth"
            value={formData.date_of_birth}
            onChange={(e) => onFieldChange('date_of_birth', e.target.value)}
            className={`w-full px-3 py-2.5 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
              errors.date_of_birth ? 'border-red-300' : 'border-slate-300'
            }`}
          />
          {errors.date_of_birth && (
            <p className="text-sm text-red-600 mt-1">{t(errors.date_of_birth as any)}</p>
          )}
        </div>

        {/* Nationality */}
        <div ref={dropdownRef} className="relative min-w-0">
          <label className="block text-base lg:text-lg font-medium text-slate-700 mb-1">
            {t('nationality')}
          </label>
          
          {/* Native select for mobile */}
          <select
            name="nationality"
            data-testid="select-nationality-mobile"
            value={formData.nationality}
            onChange={(e) => onFieldChange('nationality', e.target.value)}
            className={`sm:hidden w-full px-3 py-2.5 border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 appearance-none ${
              errors.nationality ? 'border-red-300' : 'border-slate-300'
            } ${!formData.nationality ? 'text-slate-400' : 'text-slate-900'}`}
          >
            <option value="">{t('select_nationality' as any) || 'Select'}</option>
            {NATIONALITIES.map((nat) => (
              <option key={nat.code} value={nat.code}>
                {nat.flag} {t(nat.labelKey as any)}
              </option>
            ))}
          </select>

          {/* Custom dropdown for desktop */}
          <button
            type="button"
            data-testid="button-select-nationality"
            onClick={() => setIsNationalityOpen(!isNationalityOpen)}
            className={`hidden sm:flex w-full px-3 py-2.5 border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 items-center justify-between ${
              errors.nationality ? 'border-red-300' : 'border-slate-300'
            }`}
          >
            {selectedNationality ? (
              <span className="flex items-center gap-2 truncate">
                <FlagIcon code={selectedNationality.code} size="md" />
                <span className="truncate">{t(selectedNationality.labelKey as any)}</span>
              </span>
            ) : (
              <span className="text-slate-400 truncate">{t('select_nationality' as any) || 'Select'}</span>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isNationalityOpen ? 'rotate-180' : ''}`} />
          </button>

          {isNationalityOpen && (
            <div className="hidden sm:block absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    id="nationality-search"
                    name="nationality_search"
                    placeholder={t('search' as any) || 'Search...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto">
                {filteredNationalities.map((nat) => {
                  const isSelected = formData.nationality === nat.code
                  return (
                    <button
                      key={nat.code}
                      type="button"
                      onClick={() => {
                        onFieldChange('nationality', nat.code)
                        setIsNationalityOpen(false)
                        setSearchQuery('')
                      }}
                      className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-sm ${isSelected ? 'bg-amber-50' : ''}`}
                    >
                      <FlagIcon code={nat.code} size="md" />
                      <span className="flex-1 text-left text-slate-800">{t(nat.labelKey as any)}</span>
                      {isSelected && <Check className="w-4 h-4 text-amber-500" />}
                    </button>
                  )
                })}
                {filteredNationalities.length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-slate-500">
                    {t('no_results' as any) || 'No results found'}
                  </div>
                )}
              </div>
            </div>
          )}

          {errors.nationality && (
            <p className="text-sm text-red-600 mt-1">{t(errors.nationality as any)}</p>
          )}
        </div>
      </div>
    </div>
  )
}

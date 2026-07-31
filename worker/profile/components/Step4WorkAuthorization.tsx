/**
 * Step4WorkAuthorization.tsx
 * 
 * Worker profile creation Step 4: Work Authorization
 * Handles work authorization status with 4 options:
 *   1. EU/EEA/Switzerland citizen (can work anywhere)
 *   2. Permanent resident of specific countries
 *   3. Work permit holder for specific countries
 *   4. No authorization (needs sponsorship)
 */

import React, { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/lib/useLanguage'
import type { WorkerProfileFormState } from '../types'
import type { WorkerStepField } from '../stepConfig'
import type { WorkAuthorization, WorkAuthorizationStatus } from '@/lib/types'
import { ChevronDown, Search, FileCheck, Shield, Home, Briefcase, HelpCircle, X } from 'lucide-react'
import { FlagIcon } from '@/components/ui/FlagIcon'

interface Step4Props {
  formData: WorkerProfileFormState
  errors: Partial<Record<WorkerStepField, string>>
  onFieldChange: (field: WorkerStepField, value: string | string[] | WorkAuthorization | null) => void
}

// All European countries for selection
const EUROPEAN_COUNTRIES = [
  // Western Europe
  { code: 'de', name: 'Germany', flag: '🇩🇪', nativeName: 'Deutschland' },
  { code: 'at', name: 'Austria', flag: '🇦🇹', nativeName: 'Österreich' },
  { code: 'ch', name: 'Switzerland', flag: '🇨🇭', nativeName: 'Schweiz' },
  { code: 'fr', name: 'France', flag: '🇫🇷', nativeName: 'France' },
  { code: 'be', name: 'Belgium', flag: '🇧🇪', nativeName: 'België / Belgique' },
  { code: 'nl', name: 'Netherlands', flag: '🇳🇱', nativeName: 'Nederland' },
  { code: 'lu', name: 'Luxembourg', flag: '🇱🇺', nativeName: 'Lëtzebuerg' },
  { code: 'li', name: 'Liechtenstein', flag: '🇱🇮', nativeName: 'Liechtenstein' },
  // Northern Europe
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧', nativeName: 'United Kingdom' },
  { code: 'ie', name: 'Ireland', flag: '🇮🇪', nativeName: 'Éire' },
  { code: 'dk', name: 'Denmark', flag: '🇩🇰', nativeName: 'Danmark' },
  { code: 'se', name: 'Sweden', flag: '🇸🇪', nativeName: 'Sverige' },
  { code: 'no', name: 'Norway', flag: '🇳🇴', nativeName: 'Norge' },
  { code: 'fi', name: 'Finland', flag: '🇫🇮', nativeName: 'Suomi' },
  { code: 'is', name: 'Iceland', flag: '🇮🇸', nativeName: 'Ísland' },
  // Southern Europe
  { code: 'it', name: 'Italy', flag: '🇮🇹', nativeName: 'Italia' },
  { code: 'es', name: 'Spain', flag: '🇪🇸', nativeName: 'España' },
  { code: 'pt', name: 'Portugal', flag: '🇵🇹', nativeName: 'Portugal' },
  { code: 'gr', name: 'Greece', flag: '🇬🇷', nativeName: 'Ελλάδα' },
  { code: 'mt', name: 'Malta', flag: '🇲🇹', nativeName: 'Malta' },
  { code: 'cy', name: 'Cyprus', flag: '🇨🇾', nativeName: 'Κύπρος' },
  // Eastern Europe
  { code: 'pl', name: 'Poland', flag: '🇵🇱', nativeName: 'Polska' },
  { code: 'cz', name: 'Czech Republic', flag: '🇨🇿', nativeName: 'Česko' },
  { code: 'sk', name: 'Slovakia', flag: '🇸🇰', nativeName: 'Slovensko' },
  { code: 'hu', name: 'Hungary', flag: '🇭🇺', nativeName: 'Magyarország' },
  { code: 'ro', name: 'Romania', flag: '🇷🇴', nativeName: 'România' },
  { code: 'bg', name: 'Bulgaria', flag: '🇧🇬', nativeName: 'България' },
  { code: 'ua', name: 'Ukraine', flag: '🇺🇦', nativeName: 'Україна' },
  // Baltic States
  { code: 'ee', name: 'Estonia', flag: '🇪🇪', nativeName: 'Eesti' },
  { code: 'lv', name: 'Latvia', flag: '🇱🇻', nativeName: 'Latvija' },
  { code: 'lt', name: 'Lithuania', flag: '🇱🇹', nativeName: 'Lietuva' },
  // Balkans
  { code: 'si', name: 'Slovenia', flag: '🇸🇮', nativeName: 'Slovenija' },
  { code: 'hr', name: 'Croatia', flag: '🇭🇷', nativeName: 'Hrvatska' },
  { code: 'ba', name: 'Bosnia and Herzegovina', flag: '🇧🇦', nativeName: 'Bosna i Hercegovina' },
  { code: 'rs', name: 'Serbia', flag: '🇷🇸', nativeName: 'Србија' },
  { code: 'me', name: 'Montenegro', flag: '🇲🇪', nativeName: 'Crna Gora' },
  { code: 'mk', name: 'North Macedonia', flag: '🇲🇰', nativeName: 'Северна Македонија' },
  { code: 'al', name: 'Albania', flag: '🇦🇱', nativeName: 'Shqipëri' },
  { code: 'xk', name: 'Kosovo', flag: '🇽🇰', nativeName: 'Kosovë' },
]

// Work authorization options configuration
const WORK_AUTH_OPTIONS: { 
  status: WorkAuthorizationStatus
  labelKey: string
  descriptionKey: string
  icon: React.ElementType
  color: string
  needsCountries: boolean
}[] = [
  { 
    status: 'eu_citizen', 
    labelKey: 'work_auth_eu_citizen',
    descriptionKey: 'work_auth_eu_citizen_desc',
    icon: Shield,
    color: 'emerald',
    needsCountries: false
  },
  { 
    status: 'permanent_resident', 
    labelKey: 'work_auth_permanent_resident',
    descriptionKey: 'work_auth_permanent_resident_desc',
    icon: Home,
    color: 'blue',
    needsCountries: true
  },
  { 
    status: 'work_permit_holder', 
    labelKey: 'work_auth_work_permit',
    descriptionKey: 'work_auth_work_permit_desc',
    icon: Briefcase,
    color: 'amber',
    needsCountries: true
  },
  { 
    status: 'needs_sponsorship', 
    labelKey: 'work_auth_needs_sponsorship',
    descriptionKey: 'work_auth_needs_sponsorship_desc',
    icon: HelpCircle,
    color: 'slate',
    needsCountries: false
  },
]

export const Step4WorkAuthorization: React.FC<Step4Props> = ({ formData, errors, onFieldChange }) => {
  const { t } = useLanguage()

  // Parse existing work_authorization
  const parseExistingAuth = (): { status: WorkAuthorizationStatus | null, countries: string[] } => {
    const auth = formData.work_authorization
    if (!auth) {
      return { status: null, countries: [] }
    }
    return { 
      status: auth.status, 
      countries: auth.countries || [] 
    }
  }
  
  const parsedAuth = parseExistingAuth()
  const [authStatus, setAuthStatus] = useState<WorkAuthorizationStatus | null>(parsedAuth.status)
  const [authCountries, setAuthCountries] = useState<string[]>(parsedAuth.countries)
  const [isAuthCountryDropdownOpen, setIsAuthCountryDropdownOpen] = useState(false)
  const [authCountrySearchQuery, setAuthCountrySearchQuery] = useState('')
  const authCountryDropdownRef = useRef<HTMLDivElement>(null)

  // Update work_authorization when status or countries change
  useEffect(() => {
    if (authStatus === null) {
      onFieldChange('work_authorization', null)
      return
    }
    
    const newAuth: WorkAuthorization = {
      status: authStatus,
      ...(authCountries.length > 0 && { countries: authCountries })
    }
    
    onFieldChange('work_authorization', newAuth)
  }, [authStatus, authCountries])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (authCountryDropdownRef.current && !authCountryDropdownRef.current.contains(event.target as Node)) {
        setIsAuthCountryDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAuthStatusChange = (status: WorkAuthorizationStatus) => {
    setAuthStatus(status)
    // Clear countries if the new status doesn't need them
    const option = WORK_AUTH_OPTIONS.find(o => o.status === status)
    if (option && !option.needsCountries) {
      setAuthCountries([])
    }
  }

  const handleAddAuthCountry = (countryCode: string) => {
    if (!authCountries.includes(countryCode)) {
      setAuthCountries([...authCountries, countryCode])
    }
    setIsAuthCountryDropdownOpen(false)
    setAuthCountrySearchQuery('')
  }

  const handleRemoveAuthCountry = (countryCode: string) => {
    setAuthCountries(authCountries.filter(c => c !== countryCode))
  }

  const filteredAuthCountries = EUROPEAN_COUNTRIES.filter(country => {
    if (authCountries.includes(country.code)) return false // Already selected
    if (!authCountrySearchQuery.trim()) return true
    const query = authCountrySearchQuery.toLowerCase()
    return (
      country.name.toLowerCase().includes(query) ||
      country.nativeName.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query)
    )
  })

  const getCountryByCode = (code: string) => {
    return EUROPEAN_COUNTRIES.find(c => c.code === code) || EUROPEAN_COUNTRIES[0]
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 mb-2">
        <FileCheck className="w-5 h-5 text-emerald-600" />
        <label className="text-base lg:text-lg font-medium text-slate-700">
          {t('work_authorization' as any) || 'Work Authorization'}
        </label>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        {t('work_authorization_status_desc' as any) || 'What is your work authorization status in Europe?'}
      </p>
      
      {/* 4 Work Authorization Options */}
      <div className="space-y-2">
        {WORK_AUTH_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = authStatus === option.status
          const colorClasses = {
            emerald: {
              border: isSelected ? 'border-emerald-500' : 'border-slate-200 hover:border-emerald-300',
              bg: isSelected ? 'bg-emerald-50' : '',
              icon: 'text-emerald-600',
              badge: 'bg-emerald-100 text-emerald-700'
            },
            blue: {
              border: isSelected ? 'border-blue-500' : 'border-slate-200 hover:border-blue-300',
              bg: isSelected ? 'bg-blue-50' : '',
              icon: 'text-blue-600',
              badge: 'bg-blue-100 text-blue-700'
            },
            amber: {
              border: isSelected ? 'border-amber-500' : 'border-slate-200 hover:border-amber-300',
              bg: isSelected ? 'bg-amber-50' : '',
              icon: 'text-amber-600',
              badge: 'bg-amber-100 text-amber-700'
            },
            slate: {
              border: isSelected ? 'border-slate-500' : 'border-slate-200 hover:border-slate-400',
              bg: isSelected ? 'bg-slate-100' : '',
              icon: 'text-slate-600',
              badge: 'bg-slate-200 text-slate-700'
            }
          }[option.color] ?? {
            border: isSelected ? 'border-slate-500' : 'border-slate-200 hover:border-slate-400',
            bg: isSelected ? 'bg-slate-100' : '',
            icon: 'text-slate-600',
            badge: 'bg-slate-200 text-slate-700'
          }
          
          return (
            <div key={option.status}>
              <label 
                className={`flex items-start gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all ${colorClasses.border} ${colorClasses.bg}`}
              >
                <input
                  type="radio"
                  name="workAuthStatus"
                  checked={isSelected}
                  onChange={() => handleAuthStatusChange(option.status)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? colorClasses.border.split(' ')[0] : 'border-slate-300'
                }`}>
                  {isSelected && (
                    <div className={`w-2 h-2 rounded-full ${
                      option.color === 'emerald' ? 'bg-emerald-500' :
                      option.color === 'blue' ? 'bg-blue-500' :
                      option.color === 'amber' ? 'bg-amber-500' :
                      'bg-slate-500'
                    }`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${colorClasses.icon}`} />
                    <span className="font-medium text-sm text-slate-800">
                      {t(option.labelKey as any) || option.labelKey}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t(option.descriptionKey as any) || option.descriptionKey}
                  </p>
                </div>
              </label>
              
              {/* Country Selection for options that need it */}
              {isSelected && option.needsCountries && (
                <div className="mt-2 ml-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('select_authorization_countries' as any) || 'Select countries where you have authorization:'}
                  </label>
                  
                  {/* Selected countries chips */}
                  {authCountries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {authCountries.map(code => {
                        const country = getCountryByCode(code)
                        return (
                          <span 
                            key={code}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${colorClasses.badge}`}
                          >
                            <FlagIcon code={country.code} />
                            <span>{country.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAuthCountry(code)}
                              className="ml-0.5 hover:bg-white/50 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Add country dropdown */}
                  <div className="relative" ref={authCountryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsAuthCountryDropdownOpen(!isAuthCountryDropdownOpen)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <span className="text-slate-600">
                        {t('add_country' as any) || '+ Add country'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isAuthCountryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAuthCountryDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-slate-200">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={authCountrySearchQuery}
                              onChange={(e) => setAuthCountrySearchQuery(e.target.value)}
                              placeholder={t('type_to_search_country' as any) || 'Type to search...'}
                              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        
                        <div className="max-h-40 overflow-y-auto">
                          {filteredAuthCountries.length > 0 ? (
                            filteredAuthCountries.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => handleAddAuthCountry(country.code)}
                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors text-sm"
                              >
                                <FlagIcon code={country.code} />
                                <span className="text-slate-800">{country.name}</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-3 text-sm text-slate-500 text-center">
                              {authCountries.length === EUROPEAN_COUNTRIES.length 
                                ? (t('all_countries_selected' as any) || 'All countries selected')
                                : (t('no_countries_found' as any) || 'No countries found')
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {errors.work_authorization && (
        <p className="text-sm text-red-600 mt-1">{t(errors.work_authorization as any)}</p>
      )}
    </div>
  )
}

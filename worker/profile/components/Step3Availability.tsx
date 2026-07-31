/**
 * Step3Availability.tsx
 * 
 * Worker profile creation Step 3: Availability & Location Preferences
 * Handles:
 * - Available immediately checkbox
 * - Preferred work locations (anywhere in Europe or multiple specific countries)
 */

import React, { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/lib/useLanguage'
import type { WorkerProfileFormState } from '../types'
import type { WorkerStepField } from '../stepConfig'
import { ChevronDown, Globe, Search, X, Calendar } from 'lucide-react'
import { FlagIcon } from '@/components/ui/FlagIcon'

interface Step3Props {
  formData: WorkerProfileFormState
  errors: Partial<Record<WorkerStepField, string>>
  onFieldChange: (field: WorkerStepField, value: string | string[] | boolean) => void
}

type LocationType = 'anywhere' | 'anywhere_country'

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

export const Step3Availability: React.FC<Step3Props> = ({ formData, errors, onFieldChange }) => {
  const { t } = useLanguage()

  // ==================== PREFERRED LOCATION STATE ====================

  // Parse existing preferred_locations to determine current state
  const parseExistingLocations = () => {
    const locations = formData.preferred_locations || []
    
    if (locations.length === 0) {
      return { type: 'anywhere' as LocationType, countries: [] }
    }
    
    if (locations.length === 1 && locations[0] === 'anywhere') {
      return { type: 'anywhere' as LocationType, countries: [] }
    }
    
    // Handle multiple countries in format 'anywhere:de', 'anywhere:at', etc.
    const countries: string[] = []
    for (const loc of locations) {
      if (loc.startsWith('anywhere:')) {
        const countryCode = loc.replace('anywhere:', '')
        if (countryCode && EUROPEAN_COUNTRIES.find(c => c.code === countryCode)) {
          countries.push(countryCode)
        }
      }
    }
    
    if (countries.length > 0) {
      return { type: 'anywhere_country' as LocationType, countries }
    }
    
    return { type: 'anywhere' as LocationType, countries: [] }
  }
  
  const parsed = parseExistingLocations()
  const [locationType, setLocationType] = useState<LocationType>(parsed.type)
  const [selectedLocationCountries, setSelectedLocationCountries] = useState<string[]>(parsed.countries)
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false)
  const [locationSearchQuery, setLocationSearchQuery] = useState('')
  const locationDropdownRef = useRef<HTMLDivElement>(null)

  // ==================== EFFECTS ====================
  
  // Update preferred_locations when location type or countries change
  useEffect(() => {
    let newLocations: string[] = []
    
    if (locationType === 'anywhere') {
      newLocations = ['anywhere']
    } else if (locationType === 'anywhere_country') {
      // Store each selected country as 'anywhere:countryCode'
      newLocations = selectedLocationCountries.map(code => `anywhere:${code}`)
    }
    
    onFieldChange('preferred_locations', newLocations)
  }, [locationType, selectedLocationCountries])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ==================== HANDLERS ====================

  const handleLocationTypeChange = (type: LocationType) => {
    setLocationType(type)
  }

  const handleAddLocationCountry = (countryCode: string) => {
    if (!selectedLocationCountries.includes(countryCode)) {
      setSelectedLocationCountries([...selectedLocationCountries, countryCode])
    }
    setIsLocationDropdownOpen(false)
    setLocationSearchQuery('')
  }

  const handleRemoveLocationCountry = (countryCode: string) => {
    setSelectedLocationCountries(selectedLocationCountries.filter(c => c !== countryCode))
  }

  // ==================== HELPER FUNCTIONS ====================

  const filteredLocationCountries = EUROPEAN_COUNTRIES.filter(country => {
    if (selectedLocationCountries.includes(country.code)) return false // Already selected
    if (!locationSearchQuery.trim()) return true
    const query = locationSearchQuery.toLowerCase()
    return (
      country.name.toLowerCase().includes(query) ||
      country.nativeName.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query)
    )
  })

  const getCountryByCode = (code: string) => {
    return EUROPEAN_COUNTRIES.find(c => c.code === code) || EUROPEAN_COUNTRIES[0]
  }

  // ==================== RENDER ====================

  return (
    <div className="space-y-4">
      

      {/* ==================== AVAILABLE IMMEDIATELY ==================== */}
      <div className="space-y-2">
        <label className="flex items-center gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all border-slate-200 hover:border-amber-300">
          <input
            type="checkbox"
            id="available_immediately"
            name="available_immediately"
            checked={formData.available_immediately === true}
            onChange={(e) => onFieldChange('available_immediately', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 focus:ring-2"
          />
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-sm text-slate-800">
              {t('available_immediately')}
            </span>
          </div>
        </label>
        {errors.available_immediately && (
          <p className="text-sm text-red-600 mt-1">{t(errors.available_immediately as any)}</p>
        )}
      </div>

      {/* ==================== PREFERRED LOCATION ==================== */}
      <div className="space-y-3">
        <label className="block text-base lg:text-lg font-medium text-slate-700">
          {t('where_would_you_like_to_work' as any)}
        </label>

        <div className="space-y-2">
          {/* Anywhere in Europe */}
          <label
            className={`flex items-center gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              locationType === 'anywhere'
                ? 'border-amber-500 bg-amber-50'
                : 'border-slate-200 hover:border-amber-300'
            }`}
          >
            <input
              type="radio"
              name="locationType"
              checked={locationType === 'anywhere'}
              onChange={() => handleLocationTypeChange('anywhere')}
              className="sr-only"
            />
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              locationType === 'anywhere' ? 'border-amber-500' : 'border-slate-300'
            }`}>
              {locationType === 'anywhere' && (
                <div className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-sm text-slate-800">{t('anywhere_in_europe' as any)}</span>
            </div>
          </label>

          {/* Anywhere in a Country */}
          <label
            className={`flex items-center gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              locationType === 'anywhere_country'
                ? 'border-amber-500 bg-amber-50'
                : 'border-slate-200 hover:border-amber-300'
            }`}
          >
          <input
              type="radio"
              name="locationType"
              checked={locationType === 'anywhere_country'}
              onChange={() => handleLocationTypeChange('anywhere_country')}
              className="sr-only"
            />
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              locationType === 'anywhere_country' ? 'border-amber-500' : 'border-slate-300'
            }`}>
              {locationType === 'anywhere_country' && (
                <div className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </div>
            <span className="font-medium text-sm text-slate-800">{t('anywhere_in_country' as any)}</span>
          </label>
        </div>

        {/* Country Selection for preferred location - Multiselect */}
        {locationType === 'anywhere_country' && (
          <div className="ml-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('select_work_countries' as any) || 'Select countries where you would like to work:'}
            </label>

            {/* Selected countries chips */}
            {selectedLocationCountries.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedLocationCountries.map(code => {
                  const country = getCountryByCode(code)
                  return (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium bg-amber-100 text-amber-700"
                      >
                      <FlagIcon code={country.code} />
                      <span>{country.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLocationCountry(code)}
                        className="ml-0.5 hover:bg-amber-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Add country dropdown */}
            <div className="relative" ref={locationDropdownRef}>
              <button
                type="button"
                onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
              >
                <span className="text-slate-600">
                  {t('add_country' as any) || '+ Add country'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isLocationDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLocationDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-slate-200">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                          type="text"
                          value={locationSearchQuery}
                          onChange={(e) => setLocationSearchQuery(e.target.value)}
                          placeholder={t('type_to_search_country' as any) || 'Type to search...'}
                          className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="max-h-40 overflow-y-auto">
                    {filteredLocationCountries.length > 0 ? (
                      filteredLocationCountries.map((country) => (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => handleAddLocationCountry(country.code)}
                          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors text-sm"
                        >
                          <FlagIcon code={country.code} />
                          <span className="text-slate-800">{country.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-sm text-slate-500 text-center">
                        {selectedLocationCountries.length === EUROPEAN_COUNTRIES.length
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

        {errors.preferred_locations && (
          <p className="text-sm text-red-600 mt-1">{t(errors.preferred_locations as any)}</p>
        )}
      </div>
      
    </div>
  )
}

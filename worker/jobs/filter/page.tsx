'use client'

/**
 * Filter Page for Job Postings
 * 
 * This page provides a dedicated mobile filter interface for job postings.
 * Filters are synced with the main jobs page via URL parameters.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/useLanguage'
import Navbar from '@/components/Navbar'
import type { WorkType, Language, ExperienceLevel } from '@/lib/types'
import { 
  FilterSection,
  FilterDropdownButton,
  SelectedTags,
  AnimatedDropdown,
  CheckboxItem,
  ToggleCheckbox,
  languageDisplay as sharedLanguageDisplay,
} from '@/components/shared/FilterPanel'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { 
  Filter, 
  X, 
  ChevronDown, 
  Briefcase, 
  MapPin, 
  Euro, 
  Calendar, 
  Home, 
  Utensils, 
  CheckCircle2,
  ArrowLeft,
  Search
} from 'lucide-react'

// Helper to serialize/deserialize filters from URL
const serializeFilters = (filters: any): string => {
  const params = new URLSearchParams()
  if (filters.work_types?.length) params.set('work_types', filters.work_types.join(','))
  if (filters.languages?.length) params.set('languages', filters.languages.join(','))
  if (filters.experience_levels?.length) params.set('experience_levels', filters.experience_levels.join(','))
  if (filters.locations?.length) params.set('locations', filters.locations.join(','))
  if (filters.cities?.length) params.set('cities', filters.cities.join(','))
  if (filters.min_pay) params.set('min_pay', filters.min_pay)
  if (filters.max_pay) params.set('max_pay', filters.max_pay)
  if (filters.accommodation_included) params.set('accommodation_included', 'true')
  if (filters.food_included) params.set('food_included', 'true')
  if (filters.start_date_from) params.set('start_date_from', filters.start_date_from)
  if (filters.start_date_to) params.set('start_date_to', filters.start_date_to)
  if (filters.include_negotiable) params.set('include_negotiable', 'true')
  if (filters.hide_applied) params.set('hide_applied', 'true')
  return params.toString()
}

const deserializeFilters = (searchParams: URLSearchParams) => {
  return {
    work_types: searchParams.get('work_types')?.split(',').filter(Boolean) as WorkType[] || [],
    languages: searchParams.get('languages')?.split(',').filter(Boolean) as Language[] || [],
    experience_levels: searchParams.get('experience_levels')?.split(',').filter(Boolean) as ExperienceLevel[] || [],
    locations: searchParams.get('locations')?.split(',').filter(Boolean) || [],
    cities: searchParams.get('cities')?.split(',').filter(Boolean) || [],
    min_pay: searchParams.get('min_pay') || '',
    max_pay: searchParams.get('max_pay') || '',
    accommodation_included: searchParams.get('accommodation_included') === 'true',
    food_included: searchParams.get('food_included') === 'true',
    include_negotiable: searchParams.get('include_negotiable') === 'true',
    start_date_from: searchParams.get('start_date_from') || '',
    start_date_to: searchParams.get('start_date_to') || '',
    hide_applied: searchParams.get('hide_applied') === 'true',
  }
}

export default function FilterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500 tracking-wide">Loading...</span>
          </div>
        </div>
      </div>
    }>
      <FilterPageContent />
    </Suspense>
  )
}

function FilterPageContent() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState(() => deserializeFilters(searchParams))
  const [showWorkTypeDropdown, setShowWorkTypeDropdown] = useState(false)
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [showExperienceDropdown, setShowExperienceDropdown] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [cityInput, setCityInput] = useState('')

  const workTypes: WorkType[] = ['construction', 'manufacturing', 'logistics_warehousing', 'agriculture', 'hospitality_tourism', 'cleaning_maintenance', 'care_household', 'transport_delivery', 'general_temporary', 'other']
  const languages: Language[] = ['en', 'de', 'sr', 'hr', 'bs', 'mk', 'sl', 'pl', 'bg', 'ro', 'el', 'sq', 'ar', 'uk']
  const experienceLevels: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced']
  
  // Use shared language display
  const languageDisplay = sharedLanguageDisplay

  const clearFilters = () => {
    const emptyFilters = {
      work_types: [],
      languages: [],
      experience_levels: [],
      locations: [],
      cities: [],
      min_pay: '',
      max_pay: '',
      accommodation_included: false,
      food_included: false,
      include_negotiable: false,
      start_date_from: '',
      start_date_to: '',
      hide_applied: false,
    }
    setFilters(emptyFilters)
  }

  const hasActiveFilters = filters.work_types.length > 0 || filters.languages.length > 0 || 
    filters.experience_levels.length > 0 || filters.locations.length > 0 || filters.cities.length > 0 || 
    filters.min_pay || filters.max_pay || filters.accommodation_included || filters.food_included || 
    filters.start_date_from || filters.start_date_to || filters.hide_applied

  const activeFilterCount = [
    filters.work_types.length > 0,
    filters.languages.length > 0,
    filters.experience_levels.length > 0,
    filters.cities.length > 0,
    filters.min_pay || filters.max_pay,
    filters.accommodation_included,
    filters.food_included,
    filters.start_date_from || filters.start_date_to,
    filters.hide_applied,
  ].filter(Boolean).length

  const applyFilters = () => {
    const params = serializeFilters(filters)
    router.push(`/worker/jobs${params ? `?${params}` : ''}`)
  }

  const toggleWorkType = (type: WorkType) => {
    setFilters(prev => ({
      ...prev,
      work_types: prev.work_types.includes(type)
        ? prev.work_types.filter(t => t !== type)
        : [...prev.work_types, type]
    }))
  }

  const toggleLanguage = (lang: Language) => {
    setFilters(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }))
  }

  const toggleExperience = (level: ExperienceLevel) => {
    setFilters(prev => ({
      ...prev,
      experience_levels: prev.experience_levels.includes(level)
        ? prev.experience_levels.filter(l => l !== level)
        : [...prev.experience_levels, level]
    }))
  }

  const addCity = (city: string) => {
    if (city.trim() && !filters.cities.includes(city.trim())) {
      setFilters(prev => ({
        ...prev,
        cities: [...prev.cities, city.trim()]
      }))
      setCityInput('')
    }
  }

  const removeCity = (city: string) => {
    setFilters(prev => ({
      ...prev,
      cities: prev.cities.filter(c => c !== city)
    }))
  }

  // Mock available cities - in production, fetch from jobs
  const availableCities = ['Berlin', 'Vienna', 'Zurich', 'Munich', 'Hamburg', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen']

  // Using shared FilterSection, FilterDropdownButton, SelectedTags from components/shared/FilterPanel

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200/60 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-white rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <Filter className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-slate-900">Filters</h1>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {t('clear_all')}
            </button>
          )}
        </div>
      </div>

      {/* Filter Content */}
      <div className="p-5 space-y-6 pb-40">
        {/* Work Type */}
        <FilterSection label={t('sector')}>
          <div className="relative">
            <FilterDropdownButton
              onClick={() => setShowWorkTypeDropdown(!showWorkTypeDropdown)}
              isOpen={showWorkTypeDropdown}
              hasSelection={filters.work_types.length > 0}
              placeholder={t('select_types')}
              selectionText={`${filters.work_types.length} selected`}
            />
            
            <AnimatedDropdown isOpen={showWorkTypeDropdown}>
              {workTypes.map(type => (
                <CheckboxItem
                  key={type}
                  checked={filters.work_types.includes(type)}
                  onChange={() => toggleWorkType(type)}
                  label={t(type)}
                />
              ))}
            </AnimatedDropdown>
            
            <SelectedTags
              items={filters.work_types}
              onRemove={(type) => toggleWorkType(type as WorkType)}
              renderLabel={(type) => t(type as WorkType)}
              accentColor="blue"
            />
          </div>
        </FilterSection>

        {/* City */}
        <FilterSection label={t('city')}>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={cityInput}
                onChange={(e) => {
                  setCityInput(e.target.value)
                  setShowCityDropdown(true)
                }}
                onFocus={() => setShowCityDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && cityInput.trim()) {
                    e.preventDefault()
                    addCity(cityInput)
                  }
                }}
                placeholder={t('search_city' as any) || "Search city..."}
                className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            
            {showCityDropdown && cityInput && availableCities.filter(c => 
              c.toLowerCase().includes(cityInput.toLowerCase()) && !filters.cities.includes(c)
            ).length > 0 && (
              <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                <div className="p-2">
                  {availableCities
                    .filter(c => c.toLowerCase().includes(cityInput.toLowerCase()) && !filters.cities.includes(c))
                    .slice(0, 8)
                    .map(city => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          addCity(city)
                          setShowCityDropdown(false)
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-left"
                      >
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-900">{city}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
            
            <SelectedTags
              items={filters.cities}
              onRemove={removeCity}
              renderLabel={(city) => (
                <>
                  <MapPin className="w-3 h-3" />
                  {city}
                </>
              )}
            />
          </div>
        </FilterSection>

        {/* Language */}
        <FilterSection label={t('language')}>
          <div className="relative">
            <FilterDropdownButton
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              isOpen={showLanguageDropdown}
              hasSelection={filters.languages.length > 0}
              placeholder={t('select_languages')}
              selectionText={`${filters.languages.length} selected`}
            />
            
            <AnimatedDropdown isOpen={showLanguageDropdown}>
              {languages.map(lang => (
                <CheckboxItem
                  key={lang}
                  checked={filters.languages.includes(lang)}
                  onChange={() => toggleLanguage(lang)}
                  label={languageDisplay[lang].name}
                  flag={languageDisplay[lang].flag}
                />
              ))}
            </AnimatedDropdown>
            
            <SelectedTags
              items={filters.languages}
              onRemove={(lang) => toggleLanguage(lang as Language)}
              renderLabel={(lang) => (
                <>
                  <FlagIcon code={languageDisplay[lang as Language].flag} />
                  {languageDisplay[lang as Language].name}
                </>
              )}
              accentColor="blue"
            />
          </div>
        </FilterSection>

        {/* Experience Level */}
        <FilterSection label={t('experience_level')}>
          <div className="relative">
            <FilterDropdownButton
              onClick={() => setShowExperienceDropdown(!showExperienceDropdown)}
              isOpen={showExperienceDropdown}
              hasSelection={filters.experience_levels.length > 0}
              placeholder={t('select_levels')}
              selectionText={`${filters.experience_levels.length} selected`}
            />
            
            <AnimatedDropdown isOpen={showExperienceDropdown}>
              {experienceLevels.map(level => (
                <CheckboxItem
                  key={level}
                  checked={filters.experience_levels.includes(level)}
                  onChange={() => toggleExperience(level)}
                  label={t(level)}
                />
              ))}
            </AnimatedDropdown>
            
            <SelectedTags
              items={filters.experience_levels}
              onRemove={(level) => toggleExperience(level as ExperienceLevel)}
              renderLabel={(level) => <span className="capitalize">{t(level as ExperienceLevel)}</span>}
              accentColor="blue"
            />
          </div>
        </FilterSection>

        {/* Divider */}
        <div className="h-px bg-slate-200" />

        {/* Salary Range */}
        <FilterSection label={t('salary_range')}>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min €"
              value={filters.min_pay}
              onChange={(e) => setFilters({ ...filters, min_pay: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <input
              type="number"
              placeholder="Max €"
              value={filters.max_pay}
              onChange={(e) => setFilters({ ...filters, max_pay: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="mt-2">
            <ToggleCheckbox
              checked={filters.include_negotiable}
              onChange={(checked) => setFilters({ ...filters, include_negotiable: checked })}
              label={t('include_negotiable')}
              icon={<Euro className="w-4 h-4 text-emerald-600" />}
              accentColor="blue"
            />
          </div>
        </FilterSection>

        {/* Benefits */}
        <FilterSection label={t('benefits_perks')}>
          <div className="space-y-2">
            <ToggleCheckbox
              checked={filters.accommodation_included}
              onChange={(checked) => setFilters({ ...filters, accommodation_included: checked })}
              label={t('accommodation_included')}
              icon={<Home className="w-4 h-4 text-emerald-600" />}
              accentColor="blue"
            />
            <ToggleCheckbox
              checked={filters.food_included}
              onChange={(checked) => setFilters({ ...filters, food_included: checked })}
              label={t('food_included')}
              icon={<Utensils className="w-4 h-4 text-emerald-600" />}
              accentColor="blue"
            />
          </div>
        </FilterSection>

        {/* Start Date Range */}
        <FilterSection label={t('start_date_range')}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="date"
                value={filters.start_date_from}
                onChange={(e) => setFilters({ ...filters, start_date_from: e.target.value })}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <span className="text-xs text-slate-500 mt-1 block px-1">{t('from')}</span>
            </div>
            <div>
              <input
                type="date"
                value={filters.start_date_to}
                onChange={(e) => setFilters({ ...filters, start_date_to: e.target.value })}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <span className="text-xs text-slate-500 mt-1 block px-1">{t('to')}</span>
            </div>
          </div>
        </FilterSection>

        {/* Hide Applied */}
        <FilterSection label={t('application_status') || 'Status'}>
          <ToggleCheckbox
            checked={filters.hide_applied}
            onChange={(checked) => setFilters({ ...filters, hide_applied: checked })}
            label={t('hide_applied_jobs') || 'Hide applied jobs'}
            icon={<CheckCircle2 className="w-4 h-4 text-slate-500" />}
            accentColor="blue"
          />
        </FilterSection>
      </div>

      {/* Bottom Action Button */}
      <div 
        className="fixed left-0 right-0 z-[60] bg-white border-t border-slate-100 p-4 shadow-lg"
        style={{ bottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={applyFilters}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-base font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          {t('show_results' as any) || 'Show Results'}
        </button>
      </div>
    </div>
  )
}

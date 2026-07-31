import React, { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/lib/useLanguage'
import type { WorkerProfileFormState } from '../types'
import type { WorkerStepField } from '../stepConfig'
import type { Language, WorkType } from '@/lib/types'
import type { TranslationKey } from '@/lib/i18n'
import { TEXT_SIZES } from '@/lib/typography'
import { X, ChevronDown, Search, Plus, HardHat, Factory, Package, Wheat, Hotel, Sparkles, Heart, Truck, Briefcase, Wrench } from 'lucide-react'
import { FlagIcon } from '@/components/ui/FlagIcon'

// Predefined certificates and licenses
const PREDEFINED_CERTIFICATES = [
  'driving_license_b',
  'driving_license_c',
  'driving_license_ce',
  'forklift_license',
  'crane_operator',
  'welding_certificate',
  'first_aid',
  'safety_training',
  'electrical_safety',
  'food_hygiene',
  'construction_site_safety',
  'hazmat_handling',
] as const

interface Step2Props {
  formData: WorkerProfileFormState
  errors: Partial<Record<WorkerStepField, string>>
  onFieldChange: (field: WorkerStepField, value: string | string[]) => void
}

// Language code → ISO 3166-1 alpha-2 country code for CSS flag icon
const LANGUAGE_COUNTRY_CODES: Record<Language, string> = {
  en: 'gb',
  de: 'de',
  sr: 'rs',
  hr: 'hr',
  bs: 'ba',
  mk: 'mk',
  sl: 'si',
  pl: 'pl',
  bg: 'bg',
  ro: 'ro',
  el: 'gr',
  sq: 'al',
  ar: 'sa',
  uk: 'ua',
}

const INDUSTRY_ICONS: Record<WorkType, React.ElementType> = {
  construction: HardHat,
  manufacturing: Factory,
  logistics_warehousing: Package,
  agriculture: Wheat,
  hospitality_tourism: Hotel,
  cleaning_maintenance: Sparkles,
  care_household: Heart,
  transport_delivery: Truck,
  general_temporary: Briefcase,
  other: Wrench,
}

export const Step2Sectors: React.FC<Step2Props> = ({ formData, errors, onFieldChange }) => {
  const { t } = useLanguage()
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false)
  const [languageSearch, setLanguageSearch] = useState('')
  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = useState(false)
  const [industrySearch, setIndustrySearch] = useState('')
  const [isCertificateDropdownOpen, setIsCertificateDropdownOpen] = useState(false)
  const [certificateSearch, setCertificateSearch] = useState('')
  const [customCertificate, setCustomCertificate] = useState('')
  const languageDropdownRef = useRef<HTMLDivElement>(null)
  const industryDropdownRef = useRef<HTMLDivElement>(null)
  const certificateDropdownRef = useRef<HTMLDivElement>(null)

  const languages: Language[] = ['en', 'de', 'sr', 'hr', 'bs', 'mk', 'sl', 'pl', 'bg', 'ro', 'el', 'sq', 'ar', 'uk']
  const workTypes: WorkType[] = ['construction', 'manufacturing', 'logistics_warehousing', 'agriculture', 'hospitality_tourism', 'cleaning_maintenance', 'care_household', 'transport_delivery', 'general_temporary', 'other']

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false)
      }
      if (industryDropdownRef.current && !industryDropdownRef.current.contains(event.target as Node)) {
        setIsIndustryDropdownOpen(false)
      }
      if (certificateDropdownRef.current && !certificateDropdownRef.current.contains(event.target as Node)) {
        setIsCertificateDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getLanguageName = (lang: Language): string => {
    return t(`lang_${lang}` as any) || lang.toUpperCase()
  }

  const getIndustryName = (type: WorkType): string => {
    return t(type) || type
  }

  const filteredLanguages = languages.filter((lang) => {
    const langName = getLanguageName(lang).toLowerCase()
    return langName.includes(languageSearch.toLowerCase())
  })

  const filteredIndustries = workTypes.filter((type) => {
    const typeName = getIndustryName(type).toLowerCase()
    return typeName.includes(industrySearch.toLowerCase())
  })

  const handleLanguageToggle = (lang: Language) => {
    const currentLanguages = formData.languages || []
    if (currentLanguages.includes(lang)) {
      onFieldChange('languages', currentLanguages.filter((l) => l !== lang))
    } else {
      onFieldChange('languages', [...currentLanguages, lang])
    }
  }

  const handleRemoveLanguage = (lang: Language) => {
    const currentLanguages = formData.languages || []
    onFieldChange('languages', currentLanguages.filter((l) => l !== lang))
  }

  const handleIndustryToggle = (type: WorkType) => {
    const currentTypes = formData.work_types || []
    if (currentTypes.includes(type)) {
      onFieldChange('work_types', currentTypes.filter((t) => t !== type))
    } else {
      onFieldChange('work_types', [...currentTypes, type])
    }
  }

  const handleRemoveIndustry = (type: WorkType) => {
    const currentTypes = formData.work_types || []
    onFieldChange('work_types', currentTypes.filter((t) => t !== type))
  }

  // Certificate handlers
  const getCertificateName = (cert: string): string => {
    // Check if it's a predefined certificate
    if (PREDEFINED_CERTIFICATES.includes(cert as typeof PREDEFINED_CERTIFICATES[number])) {
      return t(`cert_${cert}` as TranslationKey)
    }
    // Custom certificate - return as-is
    return cert
  }

  const filteredCertificates = PREDEFINED_CERTIFICATES.filter((cert) => {
    const certName = getCertificateName(cert).toLowerCase()
    return certName.includes(certificateSearch.toLowerCase())
  })

  const handleCertificateToggle = (cert: string) => {
    const currentCerts = formData.certifications || []
    if (currentCerts.includes(cert)) {
      onFieldChange('certifications', currentCerts.filter((c) => c !== cert))
    } else {
      onFieldChange('certifications', [...currentCerts, cert])
    }
  }

  const handleRemoveCertificate = (cert: string) => {
    const currentCerts = formData.certifications || []
    onFieldChange('certifications', currentCerts.filter((c) => c !== cert))
  }

  const handleAddCustomCertificate = () => {
    if (customCertificate.trim() && !formData.certifications?.includes(customCertificate.trim())) {
      const currentCerts = formData.certifications || []
      onFieldChange('certifications', [...currentCerts, customCertificate.trim()])
      setCustomCertificate('')
    }
  }

  return (
    <div className="space-y-4">
      {/* Languages Selection */}
      <div ref={languageDropdownRef} className="relative">
        <label className="block text-base lg:text-lg font-medium mb-1.5 text-slate-700">
          {t('languages')} *
        </label>
        
        {/* Selected Languages Tags */}
        {formData.languages && formData.languages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {formData.languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-sm font-medium"
                >
                <FlagIcon code={LANGUAGE_COUNTRY_CODES[lang as Language]} />
                <span>{getLanguageName(lang as Language)}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveLanguage(lang as Language)}
                  className="ml-0.5 hover:bg-amber-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        
        {/* Dropdown Trigger */}
        <button
          type="button"
          data-testid="button-select-languages"
          onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
          className={`w-full px-3 py-2.5 border ${errors.languages ? 'border-red-300' : 'border-slate-300'} rounded-lg bg-white text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 flex items-center justify-between`}
        >
          <span className="text-slate-500 text-sm">
            {formData.languages && formData.languages.length > 0 
              ? `${formData.languages.length} ${t('selected' as any)}`
              : t('select_languages' as any)
            }
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isLanguageDropdownOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    id="language-search"
                    name="language_search"
                    placeholder={t('search_language' as any) || 'Search languages...'}
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
              </div>
            </div>
            
            {/* Language Options */}
            <div className="max-h-48 overflow-y-auto">
              {filteredLanguages.map((lang) => {
                const isSelected = formData.languages?.includes(lang)
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleLanguageToggle(lang)}
                    className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors text-sm ${isSelected ? 'bg-amber-50' : ''}`}
                  >
                    <FlagIcon code={LANGUAGE_COUNTRY_CODES[lang]} size="md" />
                    <span className="flex-1 text-left text-slate-800">{getLanguageName(lang)}</span>
                    {isSelected && (
                      <span className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                )
              })}
              {filteredLanguages.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-slate-500">
                  {t('no_languages_found' as any)}
                </div>
              )}
            </div>
          </div>
        )}
        
        {errors.languages && (
          <p className="text-sm text-red-600 mt-1">{t(errors.languages as any)}</p>
        )}
      </div>

      {/* Industry Sector Selection */}
      <div ref={industryDropdownRef} className="relative">
        <label className="block text-base lg:text-lg font-medium mb-1.5 text-slate-700">
          {t('industry_sector' as any) || 'Industry Sector'} *
        </label>
        
        {/* Selected Industries Tags */}
        {formData.work_types && formData.work_types.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {formData.work_types.map((type) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-sm font-medium"
              >
                {(() => { const Icon = INDUSTRY_ICONS[type as WorkType]; return <Icon className="w-3.5 h-3.5 shrink-0" /> })()}
                <span>{getIndustryName(type as WorkType)}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveIndustry(type as WorkType)}
                  className="ml-0.5 hover:bg-amber-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        
        {/* Dropdown Trigger */}
        <button
          type="button"
          data-testid="button-select-work-types"
          onClick={() => setIsIndustryDropdownOpen(!isIndustryDropdownOpen)}
          className={`w-full px-3 py-2.5 border ${errors.work_types ? 'border-red-300' : 'border-slate-300'} rounded-lg bg-white text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 flex items-center justify-between`}
        >
          <span className="text-slate-500 text-sm">
            {formData.work_types && formData.work_types.length > 0 
              ? `${formData.work_types.length} ${t('selected' as any)}`
              : t('select_industries' as any)
            }
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isIndustryDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isIndustryDropdownOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    id="industry-search"
                    name="industry_search"
                    placeholder={t('search_industry' as any) || 'Search industries...'}
                    value={industrySearch}
                    onChange={(e) => setIndustrySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
              </div>
            </div>
            
            {/* Industry Options */}
            <div className="max-h-48 overflow-y-auto">
              {filteredIndustries.map((type) => {
                const isSelected = formData.work_types?.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleIndustryToggle(type)}
                    className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors text-sm ${isSelected ? 'bg-amber-50' : ''}`}
                  >
                    {(() => { const Icon = INDUSTRY_ICONS[type]; return <Icon className="w-4 h-4 text-slate-500 shrink-0" /> })()}
                    <span className="flex-1 text-left text-slate-800">{getIndustryName(type)}</span>
                    {isSelected && (
                      <span className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                )
              })}
              {filteredIndustries.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-slate-500">
                  {t('no_industries_found' as any)}
                </div>
              )}
            </div>
          </div>
        )}
        
        {errors.work_types && (
          <p className="text-sm text-red-600 mt-1">{t(errors.work_types as any)}</p>
        )}
      </div>

      {/* Certificates & Licenses Selection */}
      <div ref={certificateDropdownRef} className="relative">
        <label className="block text-base lg:text-lg font-medium mb-1.5 text-slate-700">
          {t('certificates_and_licenses')}
        </label>
        
        {/* Selected Certificates Tags */}
        {formData.certifications && formData.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {formData.certifications.map((cert) => (
              <span
                key={cert}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 text-green-800 rounded-full text-sm font-medium"
              >
                <span>{getCertificateName(cert)}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCertificate(cert)}
                  className="ml-0.5 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        
        {/* Dropdown Trigger */}
        <button
          type="button"
          onClick={() => setIsCertificateDropdownOpen(!isCertificateDropdownOpen)}
          className={`w-full px-3 py-2.5 border ${errors.certifications ? 'border-red-300' : 'border-slate-300'} rounded-lg bg-white text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 flex items-center justify-between`}
        >
          <span className="text-slate-500 text-sm">
            {formData.certifications && formData.certifications.length > 0 
              ? `${formData.certifications.length} ${t('selected')}`
              : t('select_certificates')
            }
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCertificateDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isCertificateDropdownOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    id="certificate-search"
                    name="certificate_search"
                    placeholder={t('search_certificates')}
                    value={certificateSearch}
                    onChange={(e) => setCertificateSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
              </div>
            </div>
            
            {/* Certificate Options */}
            <div className="max-h-40 overflow-y-auto">
              {filteredCertificates.map((cert) => {
                const isSelected = formData.certifications?.includes(cert)
                return (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => handleCertificateToggle(cert)}
                    className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors text-sm ${isSelected ? 'bg-green-50' : ''}`}
                  >
                    <span className="flex-1 text-left text-slate-800">{getCertificateName(cert)}</span>
                    {isSelected && (
                      <span className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                )
              })}
              {filteredCertificates.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-slate-500">
                  {t('no_certificates_found')}
                </div>
              )}
            </div>

          </div>
        )}
        
        {errors.certifications && (
          <p className="text-sm text-red-600 mt-1">{t(errors.certifications as any)}</p>
        )}
      </div>

      {/* Add Custom Certificate - Compact inline input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          id="custom-certificate"
          name="custom_certificate"
          value={customCertificate}
          onChange={(e) => setCustomCertificate(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomCertificate())}
          placeholder={t('enter_certificate_name')}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
        />
        <button
          type="button"
          onClick={handleAddCustomCertificate}
          disabled={!customCertificate.trim()}
          className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">{t('add' as any) || 'Add'}</span>
        </button>
      </div>
    </div>
  )
}


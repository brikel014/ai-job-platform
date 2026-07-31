import React, { useState, useEffect } from 'react'
import { UnifiedLocationInput, StructuredLocation } from '@/components/ui/UnifiedLocationInput'
import { useLanguage } from '@/lib/useLanguage'
import type { EmployerProfileFormState } from '../types'

interface Step2Props {
  formData: EmployerProfileFormState
  errors: Partial<Record<keyof EmployerProfileFormState, string>>
  onFieldChange: (field: keyof EmployerProfileFormState, value: string) => void
}

export const Step2Location: React.FC<Step2Props> = ({ formData, errors, onFieldChange }) => {
  const { t } = useLanguage()
  
  // Build initial display value from existing form data
  const buildDisplayValue = () => {
    const parts = []
    if (formData.address) parts.push(formData.address)
    else if (formData.city) parts.push(formData.city)
    if (formData.country && !formData.address?.includes(formData.country)) {
      parts.push(formData.country)
    }
    return parts.join(', ')
  }
  
  const [locationValue, setLocationValue] = useState(buildDisplayValue)
  
  // Sync when form data changes externally
  useEffect(() => {
    const newValue = buildDisplayValue()
    if (newValue !== locationValue && newValue) {
      setLocationValue(newValue)
    }
  }, [formData.address, formData.city, formData.country])

  // Handle structured location from autocomplete or manual parsing
  const handleLocationChange = (location: StructuredLocation) => {
    // Build a proper street address from components
    let streetAddress = ''
    if (location.route) {
      streetAddress = location.street_number 
        ? `${location.route} ${location.street_number}` 
        : location.route
      if (location.postal_code) {
        streetAddress = `${streetAddress}, ${location.postal_code}`
      }
    }
    
    // Update form fields
    // Use full address if we have street info, otherwise use the full location string
    if (streetAddress) {
      onFieldChange('address', streetAddress)
    } else if (location.location_full && !location.city) {
      // Only set address if there's no city (pure address entry)
      onFieldChange('address', location.location_full)
    } else {
      onFieldChange('address', '')
    }
    
    if (location.city) {
      onFieldChange('city', location.city)
    }
    if (location.country) {
      onFieldChange('country', location.country)
    }
  }

  // Determine error message
  const errorMessage = errors.city 
    ? t(errors.city as any) 
    : errors.country 
      ? t(errors.country as any)
      : errors.address 
        ? t(errors.address as any) 
        : undefined

  return (
    <div className="space-y-4">
      <UnifiedLocationInput
        value={locationValue}
        onChange={setLocationValue}
        onLocationChange={handleLocationChange}
        label={t('location')}
        placeholder={t('location_placeholder') || 'Enter city, address, or location...'}
        required
        error={errorMessage}
        data-testid="employer-profile-location"
      />
      
      {/* Show parsed values for transparency */}
      {(formData.city || formData.country) && (
        <div className="bg-slate-50 rounded-lg p-3 text-lg text-slate-600">
          <p className="font-medium text-slate-700 mb-1">{t('parsed_location') || 'Detected location'}:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {formData.city && (
              <span><span className="text-slate-500">{t('city')}:</span> {formData.city}</span>
            )}
            {formData.country && (
              <span><span className="text-slate-500">{t('country')}:</span> {formData.country}</span>
            )}
            {formData.address && (
              <span><span className="text-slate-500">{t('address')}:</span> {formData.address}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

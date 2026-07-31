'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import Link from 'next/link'
import { useEmployerData } from '@/lib/contexts/EmployerDataContext'
import { getDirectOffersForEmployer } from '@/lib/db/optimized'
import { logError } from '@/lib/logger'
import type { JobPosting, WorkerProfile, JobApplication, Language } from '@/lib/types'
import { translateCountryCode } from '@/lib/utils/countryTranslation'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Briefcase, 
  Calendar, 
  Euro, 
  ChevronRight,
  Users,
  MoreHorizontal,
  Eye,
  ArrowRight,
  X,
  MapPin,
  Home,
  Utensils,
  User,
  MessageSquare,
  Building2
} from 'lucide-react'

interface SentOfferWithDetails {
  offer: JobApplication
  job?: JobPosting
  worker?: WorkerProfile
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Language display helper — flag field is ISO 3166-1 alpha-2 country code
const languageDisplay: Record<Language, { flag: string; name: string }> = {
  en: { flag: 'gb', name: 'English' },
  de: { flag: 'de', name: 'German' },
  sr: { flag: 'rs', name: 'Serbian' },
  hr: { flag: 'hr', name: 'Croatian' },
  bs: { flag: 'ba', name: 'Bosnian' },
  mk: { flag: 'mk', name: 'Macedonian' },
  sl: { flag: 'si', name: 'Slovenian' },
  pl: { flag: 'pl', name: 'Polish' },
  bg: { flag: 'bg', name: 'Bulgarian' },
  ro: { flag: 'ro', name: 'Romanian' },
  el: { flag: 'gr', name: 'Greek' },
  sq: { flag: 'al', name: 'Albanian' },
  ar: { flag: 'sa', name: 'Arabic' },
  uk: { flag: 'ua', name: 'Ukrainian' },
}

// Job Offer Detail Panel Component (Sliding Panel)
function OfferDetailPanel({ 
  offerData, 
  onClose, 
  t,
  language
}: { 
  offerData: SentOfferWithDetails | null
  onClose: () => void
  t: (key: any) => string
  language: string
}) {
  if (!offerData) return null

  const { offer, job, worker } = offerData
  const workerName = worker?.full_name || 'Worker'

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'offered':
        return t('pending')
      case 'hired':
        return t('accepted')
      case 'rejected':
        return t('declined')
      case 'offer_expired':
        return t('offer_expired') || 'Expired'
      default:
        return status
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Worker Avatar */}
            <div className="flex-shrink-0">
              {worker?.profile_image_url ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-slate-100">
                  <img
                    src={worker.profile_image_url}
                    alt={workerName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-slate-100">
                  <span className="text-lg font-semibold text-white">{getInitials(workerName)}</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{workerName}</h2>
              {job && (
                <Link 
                  href={`/employer/jobs/${job.id}`}
                  className="inline-flex items-center gap-1.5 mt-1 text-sm text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <span className="font-medium truncate">{job.title}</span>
                </Link>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Quick info badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${
            offer.status === 'hired'
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : offer.status === 'rejected' || offer.status === 'offer_expired'
              ? 'bg-slate-100 text-slate-500 border-slate-200'
              : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            {getStatusLabel(offer.status)}
          </span>
          {job?.location_city && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium border border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {job.location_city}
              {job.location_country && `, ${translateCountryCode(job.location_country, language as Language)}`}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">
            <Euro className="w-3.5 h-3.5 text-slate-400" />
            {job?.salary_range 
              ? t(`salary_${job.salary_range}` as any) || job.salary_range.replace(/_/g, ' ')
              : job?.pay_netto && job.pay_netto > 0 
                ? `€${job.pay_netto}/mo`
                : job?.pay_brutto && job.pay_brutto > 0
                  ? `€${job.pay_brutto}/mo`
                  : t('salary_negotiable')}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <div className="p-6 space-y-6">
          
          {/* Offer Message */}
          {offer.message && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {t('message') || 'Your Message'}
              </h3>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex gap-3">
                  <MessageSquare className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{offer.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Worker Information */}
          {worker && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {t('worker_information') || 'Worker Information'}
              </h3>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {worker.profile_image_url ? (
                      <img 
                        src={worker.profile_image_url} 
                        alt={workerName}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{workerName}</p>
                    {worker.nationality && (
                      <p className="text-xs text-slate-500">
                        {translateCountryCode(worker.nationality, language as Language)}
                      </p>
                    )}
                  </div>
                </div>
                {worker.bio && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {worker.bio}
                  </p>
                )}
                {worker.preferred_locations && worker.preferred_locations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-1.5">{t('preferred_locations') || 'Preferred Locations'}:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {worker.preferred_locations.map((location, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-white text-slate-600 rounded-md text-xs border border-slate-200">
                          <MapPin className="w-3 h-3" />
                          {location}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Job Description */}
          {job?.description && (
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t('description')}</h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
          )}

          {/* Job Details Grid */}
          {job && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{t('work_type')}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{t(job.work_type)}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{t('start_date')}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {new Date(job.start_date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{t('job_type') || 'Job Type'}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {job.job_type ? (t(`job_type_${job.job_type}` as any) || job.job_type.replace(/_/g, ' ')) : '-'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                  <Euro className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{t('salary')}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {job.salary_range 
                    ? t(`salary_${job.salary_range}` as any) || job.salary_range.replace(/_/g, ' ')
                    : job.pay_netto && job.pay_netto > 0 
                      ? `€${job.pay_netto}/mo`
                      : job.pay_brutto && job.pay_brutto > 0
                        ? `€${job.pay_brutto}/mo (${t('brutto')})`
                        : t('salary_negotiable')}
                </p>
              </div>
            </div>
          )}

          {/* Benefits */}
          {job && (job.accommodation_included || job.food_included) && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('benefits_perks')}</h3>
              <div className="flex flex-wrap gap-2">
                {job.accommodation_included && (
                  <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-700 rounded-xl font-medium text-sm border border-slate-200">
                    <Home className="w-4 h-4 text-slate-400" />
                    {t('accommodation_included')}
                  </span>
                )}
                {job.food_included && (
                  <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-700 rounded-xl font-medium text-sm border border-slate-200">
                    <Utensils className="w-4 h-4 text-slate-400" />
                    {t('food_included')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Language Requirements */}
          {job?.language_requirements && job.language_requirements.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('language_requirements') || 'Language Requirements'}</h3>
              <div className="flex flex-wrap gap-2">
                {job.language_requirements.map((lang) => {
                  const langInfo = languageDisplay[lang as Language] || { flag: '', name: lang }
                  return (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 rounded-xl font-medium text-sm border border-slate-200"
                    >
                      <FlagIcon code={langInfo.flag} />
                      <span>{langInfo.name}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Offer Sent Date */}
          <div className="text-center text-xs text-slate-400 pt-2">
            {t('sent') || 'Offer sent'}: {new Date(offer.offered_at || offer.applied_at).toLocaleDateString(undefined, { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Fixed Action Buttons */}
      <div className="flex-shrink-0 p-6 border-t border-slate-200 bg-white space-y-3">
        {worker && (
          <Link
            href={`/worker/view-profile?id=${worker.id}`}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white text-base rounded-xl font-semibold hover:bg-blue-700 transition-all"
          >
            <Eye className="w-5 h-5" />
            {t('view_worker_profile') || 'View Worker Profile'}
          </Link>
        )}
        {job && (
          <Link
            href={`/employer/jobs/${job.id}/applications`}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 text-slate-700 text-base rounded-xl font-semibold hover:bg-slate-200 transition-all border border-slate-200"
          >
            <Briefcase className="w-5 h-5" />
            {t('view_application') || 'View Application'}
            <ChevronRight className="w-5 h-5" />
          </Link>
        )}
        <button
          onClick={onClose}
          className="w-full px-6 py-4 bg-slate-100 text-slate-600 text-base rounded-xl font-semibold hover:bg-slate-200 transition-all border border-slate-200"
        >
          {t('close')}
        </button>
      </div>
    </div>
  )
}


export default function EmployerJobOffersPage() {
  const { user, role } = useAuth()
  const { t, language } = useLanguage()
  const { profile: employerProfile } = useEmployerData()
  const [offers, setOffers] = useState<SentOfferWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'offered' | 'hired' | 'rejected'>('all')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<SentOfferWithDetails | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  useEffect(() => {
    if (user && role === 'employer' && employerProfile) {
      loadSentOffers()
    }
  }, [user, role, employerProfile?.id])

  const loadSentOffers = async () => {
    if (!user || !employerProfile) return

    setLoading(true)

    try {
      const directOffers = await getDirectOffersForEmployer(employerProfile.id)

      const offersWithDetails: SentOfferWithDetails[] = directOffers.map(app => ({
        offer: app,
        job: app.job,
        worker: app.worker,
      }))

      setOffers(offersWithDetails)
    } catch (error) {
      logError('EmployerJobOffers', error, undefined, 'Error loading sent offers')
    } finally {
      setLoading(false)
    }
  }

  const filteredOffers = offers.filter(offer => {
    if (filter === 'all') return true
    if (filter === 'offered') return offer.offer.status === 'offered'
    if (filter === 'hired') return offer.offer.status === 'hired'
    if (filter === 'rejected') return ['rejected', 'offer_expired'].includes(offer.offer.status)
    return true
  })

  const offeredCount = offers.filter(o => o.offer.status === 'offered').length
  const hiredCount = offers.filter(o => o.offer.status === 'hired').length
  const rejectedCount = offers.filter(o => ['rejected', 'offer_expired'].includes(o.offer.status)).length

  const handleOpenOfferDetails = (offerData: SentOfferWithDetails) => {
    setSelectedOffer(offerData)
    setIsPanelOpen(true)
  }

  const handleCloseOfferDetail = () => {
    setIsPanelOpen(false)
    // Keep selectedOffer for animation, clear after transition
    setTimeout(() => {
      setSelectedOffer(null)
    }, 300)
  }

  const getStatusConfig = (offerData: SentOfferWithDetails) => {
    if (offerData.offer.status === 'hired') {
      return { text: t('accepted'), bgColor: 'bg-emerald-50', textColor: 'text-emerald-600', borderColor: 'border-emerald-100' }
    }
    if (offerData.offer.status === 'rejected') {
      return { text: t('declined'), bgColor: 'bg-slate-100', textColor: 'text-slate-500', borderColor: 'border-slate-200' }
    }
    if (offerData.offer.status === 'offer_expired') {
      return { text: t('offer_expired') || 'Expired', bgColor: 'bg-slate-100', textColor: 'text-slate-500', borderColor: 'border-slate-200' }
    }
    return { text: t('pending'), bgColor: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-100' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-sm font-medium text-slate-500">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden" data-testid="employer-offers-page">
      {/* Mobile Full-Screen Offer Detail Panel */}
      <div 
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          isPanelOpen ? 'visible' : 'invisible'
        }`}
      >
        <div 
          className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
            isPanelOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleCloseOfferDetail}
        />
        
        <div className={`absolute inset-y-0 right-0 w-full bg-white shadow-2xl transition-transform duration-300 ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          {selectedOffer && (
            <OfferDetailPanel
              offerData={selectedOffer}
              onClose={handleCloseOfferDetail}
              t={t}
              language={language}
            />
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-[calc(100vh-64px)]">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto transition-all duration-300 min-w-0">
          <div className="max-w-[1800px] mx-auto px-6 py-4">
            {/* Header */}
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-slate-900">{t('job_offers')}</h1>
              <p className="text-base text-slate-500 mt-1">
                {offers.length} {t('total')}
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="mb-5">
              <div className="inline-flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                {[
                  { key: 'all', label: t('all'), count: offers.length, icon: <Send className="w-4 h-4" /> },
                  { key: 'offered', label: t('pending'), count: offeredCount, icon: <Clock className="w-4 h-4" /> },
                  { key: 'hired', label: t('accepted'), count: hiredCount, icon: <CheckCircle className="w-4 h-4" /> },
                  { key: 'rejected', label: t('declined'), count: rejectedCount, icon: <XCircle className="w-4 h-4" /> },
                ].map(({ key, label, count, icon }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as typeof filter)}
                    className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                      filter === key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {icon}
                    <span>{label}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ml-0.5 ${
                      filter === key
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Offers List */}
            <div className="space-y-4 pb-6">
          {filteredOffers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                {filter === 'hired' ? <CheckCircle className="w-8 h-8 text-slate-400" /> :
                 filter === 'rejected' ? <XCircle className="w-8 h-8 text-slate-400" /> :
                 filter === 'offered' ? <Clock className="w-8 h-8 text-slate-400" /> :
                 <Send className="w-8 h-8 text-slate-400" />}
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {filter === 'all' ? t('no_sent_offers') :
                 filter === 'offered' ? `${t('no')} ${t('pending').toLowerCase()}` :
                 filter === 'hired' ? `${t('no')} ${t('accepted').toLowerCase()}` :
                 `${t('no')} ${t('declined').toLowerCase()}`}
              </h3>
              <p className="text-base text-slate-500 mb-5 max-w-sm mx-auto">
                {filter === 'all' ? t('no_sent_offers_description') :
                 filter === 'offered' ? t('no_sent_offers_description') :
                 filter === 'hired' ? t('no_sent_offers_description') :
                 t('no_sent_offers_description')}
              </p>
              {filter === 'all' && (
                <Link
                  href="/employer/workers"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Users className="w-5 h-5" />
                  {t('browse_workers') || 'Browse Workers'}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
            </div>
          ) : (
            filteredOffers.map((offerData, index) => {
              const isExpanded = expandedCard === offerData.offer.id
              const workerName = offerData.worker?.full_name || 'Worker'
              const status = getStatusConfig(offerData)
              
              return (
                  <div
                    key={offerData.offer.id}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                  <div 
                    className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all hover:shadow-lg hover:-translate-y-0.5 overflow-hidden cursor-pointer"
                    onClick={() => handleOpenOfferDetails(offerData)}
                  >
                    <div className="p-4 lg:p-5">
                      <div className="flex items-start gap-3 lg:gap-4">
                        {/* Avatar */}
                        <Link 
                          href={offerData.worker ? `/worker/view-profile?id=${offerData.worker.id}` : '#'}
                          className="flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {offerData.worker?.profile_image_url ? (
                            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl overflow-hidden ring-2 ring-slate-100">
                              <img
                                src={offerData.worker.profile_image_url}
                                alt={workerName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-slate-100">
                              <span className="text-base lg:text-lg font-semibold text-white">{getInitials(workerName)}</span>
                            </div>
                          )}
                        </Link>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Name & Status */}
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="min-w-0">
                              <Link 
                                href={offerData.worker ? `/worker/view-profile?id=${offerData.worker.id}` : '#'}
                                className="text-base lg:text-lg font-semibold text-slate-900 hover:text-blue-600 transition-colors block truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {workerName}
                              </Link>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border mt-1 ${status.bgColor} ${status.textColor} ${status.borderColor}`}>
                                {status.text}
                              </span>
                            </div>
                            {/* Mobile Expand Button */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedCard(isExpanded ? null : offerData.offer.id)
                              }}
                              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0 -mr-1"
                            >
                              <MoreHorizontal className="w-5 h-5 text-slate-400" />
                            </button>
                          </div>
                          
                          {/* Job Title */}
                          <p className="text-sm lg:text-base text-slate-500 flex items-center gap-1.5 mb-2 lg:mb-3">
                            <Briefcase className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{offerData.job?.title || 'Job Offer'}</span>
                          </p>
                          
                          {/* Tags - Hidden on mobile, shown on desktop */}
                          <div className="hidden lg:flex flex-wrap items-center gap-2">
                            {offerData.job?.work_type && (
                              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-sm font-medium">
                                {t(offerData.job.work_type)}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-sm font-medium">
                                <Euro className="w-4 h-4" />
                                {offerData.job?.salary_range
                                  ? t(`salary_${offerData.job.salary_range}` as any) || offerData.job.salary_range.replace(/_/g, ' ')
                                  : offerData.job?.pay_netto && offerData.job.pay_netto > 0
                                    ? `€${offerData.job.pay_netto}/mo`
                                    : offerData.job?.pay_brutto && offerData.job.pay_brutto > 0
                                      ? `€${offerData.job.pay_brutto}/mo (${t('brutto')})`
                                      : t('salary_negotiable')}
                              </span>
                            {offerData.job?.start_date && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-sm font-medium">
                                <Calendar className="w-4 h-4" />
                                {new Date(offerData.job.start_date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            )}
                            <span className="text-sm text-slate-400">
                              Sent {new Date(offerData.offer.offered_at || offerData.offer.applied_at).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          
                          {/* Mobile: Compact tags row */}
                          <div className="flex lg:hidden items-center gap-2 text-xs text-slate-500">
                            {offerData.job?.work_type && (
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                                {t(offerData.job.work_type)}
                              </span>
                            )}
                            <span className="text-slate-400">
                              {new Date(offerData.offer.offered_at || offerData.offer.applied_at).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                        
                        {/* Desktop Actions */}
                        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                          {offerData.worker && (
                            <Link
                              href={`/worker/view-profile?id=${offerData.worker.id}`}
                              className="flex items-center gap-2 px-4 py-2.5 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye className="w-4 h-4" />
                              Profile
                            </Link>
                          )}
                          {offerData.job && (
                            <Link
                              href="/employer/jobs"
                              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Application
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile Expanded Actions */}
                    {isExpanded && (
                      <div className="lg:hidden border-t border-slate-200 p-3 bg-slate-50 flex gap-2">
                        {offerData.worker && (
                          <Link
                            href={`/worker/view-profile?id=${offerData.worker.id}`}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white text-slate-700 border border-slate-200 text-sm font-medium rounded-xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="w-4 h-4" />
                            Profile
                          </Link>
                        )}
                        {offerData.job && (
                          <Link
                            href="/employer/jobs"
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Briefcase className="w-4 h-4" />
                            View
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
            </div>
          </div>
        </div>

        {/* Desktop Side Panel */}
        <div className={`bg-white border-l border-slate-200 overflow-hidden transition-all duration-300 ${
          isPanelOpen ? 'w-[45%] xl:w-[40%]' : 'w-0'
        }`}>
          {selectedOffer && (
            <OfferDetailPanel
              offerData={selectedOffer}
              onClose={handleCloseOfferDetail}
              t={t}
              language={language}
            />
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="max-w-[1800px] mx-auto px-4 pb-4 pt-3">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-slate-900">{t('job_offers')}</h1>
            <p className="text-base text-slate-500 mt-1">
              {offers.length} {t('total')}
            </p>
          </div>

          {/* Filter Tabs - Scrollable on mobile */}
          <div className="mb-5">
            <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
              <div className="inline-flex gap-1.5 p-1 bg-slate-100 rounded-xl min-w-max">
                {[
                  { key: 'all', label: t('all'), count: offers.length, icon: <Send className="w-4 h-4" /> },
                  { key: 'offered', label: t('pending'), count: offeredCount, icon: <Clock className="w-4 h-4" /> },
                  { key: 'hired', label: t('accepted'), count: hiredCount, icon: <CheckCircle className="w-4 h-4" /> },
                  { key: 'rejected', label: t('declined'), count: rejectedCount, icon: <XCircle className="w-4 h-4" /> },
                ].map(({ key, label, count, icon }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as typeof filter)}
                    className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                      filter === key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {icon}
                    <span>{label}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ml-0.5 ${
                      filter === key
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Offers List */}
          <div className="space-y-4 pb-24">
            {filteredOffers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {filter === 'hired' ? <CheckCircle className="w-8 h-8 text-slate-400" /> :
                   filter === 'rejected' ? <XCircle className="w-8 h-8 text-slate-400" /> :
                   filter === 'offered' ? <Clock className="w-8 h-8 text-slate-400" /> :
                   <Send className="w-8 h-8 text-slate-400" />}
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  {filter === 'all' ? t('no_sent_offers') :
                   filter === 'offered' ? `${t('no')} ${t('pending').toLowerCase()}` :
                   filter === 'hired' ? `${t('no')} ${t('accepted').toLowerCase()}` :
                   `${t('no')} ${t('declined').toLowerCase()}`}
                </h3>
                <p className="text-base text-slate-500 mb-5 max-w-sm mx-auto">
                  {filter === 'all' ? t('no_sent_offers_description') :
                   filter === 'offered' ? t('no_sent_offers_description') :
                   filter === 'hired' ? t('no_sent_offers_description') :
                   t('no_sent_offers_description')}
                </p>
                {filter === 'all' && (
                  <Link
                    href="/employer/workers"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Users className="w-5 h-5" />
                    {t('browse_workers') || 'Browse Workers'}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                )}
              </div>
            ) : (
              filteredOffers.map((offerData, index) => {
                const isExpanded = expandedCard === offerData.offer.id
                const workerName = offerData.worker?.full_name || 'Worker'
                const status = getStatusConfig(offerData)
                
                return (
                  <div
                    key={offerData.offer.id}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div 
                      className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all hover:shadow-lg hover:-translate-y-0.5 overflow-hidden cursor-pointer"
                      onClick={() => handleOpenOfferDetails(offerData)}
                    >
                      <div className="p-4 lg:p-5">
                        <div className="flex items-start gap-3 lg:gap-4">
                          {/* Avatar */}
                          <Link 
                            href={offerData.worker ? `/worker/view-profile?id=${offerData.worker.id}` : '#'}
                            className="flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {offerData.worker?.profile_image_url ? (
                              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl overflow-hidden ring-2 ring-slate-100">
                                <img
                                  src={offerData.worker.profile_image_url}
                                  alt={workerName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-slate-100">
                                <span className="text-base lg:text-lg font-semibold text-white">{getInitials(workerName)}</span>
                              </div>
                            )}
                          </Link>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Name & Status */}
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="min-w-0">
                                <Link 
                                  href={offerData.worker ? `/worker/view-profile?id=${offerData.worker.id}` : '#'}
                                  className="text-base lg:text-lg font-semibold text-slate-900 hover:text-blue-600 transition-colors block truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {workerName}
                                </Link>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border mt-1 ${status.bgColor} ${status.textColor} ${status.borderColor}`}>
                                  {status.text}
                                </span>
                              </div>
                              {/* Mobile Expand Button */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedCard(isExpanded ? null : offerData.offer.id)
                                }}
                                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0 -mr-1"
                              >
                                <MoreHorizontal className="w-5 h-5 text-slate-400" />
                              </button>
                            </div>
                            
                            {/* Job Title */}
                            <p className="text-sm lg:text-base text-slate-500 flex items-center gap-1.5 mb-2 lg:mb-3">
                              <Briefcase className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{offerData.job?.title || 'Job Offer'}</span>
                            </p>
                            
                            {/* Tags - Hidden on mobile, shown on desktop */}
                            <div className="hidden lg:flex flex-wrap items-center gap-2">
                              {offerData.job?.work_type && (
                                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-sm font-medium">
                                  {t(offerData.job.work_type)}
                                </span>
                              )}
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-sm font-medium">
                                  <Euro className="w-4 h-4" />
                                  {offerData.job?.salary_range
                                    ? t(`salary_${offerData.job.salary_range}` as any) || offerData.job.salary_range.replace(/_/g, ' ')
                                    : offerData.job?.pay_netto && offerData.job.pay_netto > 0
                                      ? `€${offerData.job.pay_netto}/mo`
                                      : offerData.job?.pay_brutto && offerData.job.pay_brutto > 0
                                        ? `€${offerData.job.pay_brutto}/mo (${t('brutto')})`
                                        : t('salary_negotiable')}
                                </span>
                              {offerData.job?.start_date && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-sm font-medium">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(offerData.job.start_date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              )}
                              <span className="text-sm text-slate-400">
                                Sent {new Date(offerData.offer.offered_at || offerData.offer.applied_at).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                            
                            {/* Mobile: Compact tags row */}
                            <div className="flex lg:hidden items-center gap-2 text-xs text-slate-500">
                              {offerData.job?.work_type && (
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                                  {t(offerData.job.work_type)}
                                </span>
                              )}
                              <span className="text-slate-400">
                                {new Date(offerData.offer.offered_at || offerData.offer.applied_at).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                          
                          {/* Desktop Actions */}
                          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                            {offerData.worker && (
                              <Link
                                href={`/worker/view-profile?id=${offerData.worker.id}`}
                                className="flex items-center gap-2 px-4 py-2.5 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Eye className="w-4 h-4" />
                                Profile
                              </Link>
                            )}
                            {offerData.job && (
                              <Link
                                href="/employer/jobs"
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Application
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile Expanded Actions */}
                      {isExpanded && (
                        <div className="lg:hidden border-t border-slate-200 p-3 bg-slate-50 flex gap-2">
                          {offerData.worker && (
                            <Link
                              href={`/worker/view-profile?id=${offerData.worker.id}`}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white text-slate-700 border border-slate-200 text-sm font-medium rounded-xl"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye className="w-4 h-4" />
                              Profile
                            </Link>
                          )}
                          {offerData.job && (
                            <Link
                              href="/employer/jobs"
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Briefcase className="w-4 h-4" />
                              View
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

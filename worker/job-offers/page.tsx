'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import { translateCountryCode } from '@/lib/utils/countryTranslation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { getWorkerProfile, getConversationByJobApplication, confirmOfferAtomic, declineOfferAtomic } from '@/lib/db'
import { getDirectOffersForWorker } from '@/lib/db/optimized'
import type { DirectOfferWithDetails } from '@/lib/db/optimized'
import type { Language } from '@/lib/types'
import { ProfileTooltip } from '@/components/onboarding/ProfileTooltip'
import { logError } from '@/lib/logger'
import { 
  Mail, 
  Clock, 
  Briefcase, 
  Building2, 
  Euro,
  MapPin,
  Home,
  Utensils,
  Check,
  X,
  CheckCircle,
  XCircle,
  Calendar,
  MessageSquare,
  Info,
  ChevronRight,
  Zap
} from 'lucide-react'
import { AcceptButton, DeclineButton, MessageButton, ContactButton, ActionButtonGroup } from '@/components/ui'
import { FlagIcon } from '@/components/ui/FlagIcon'
import dynamic from 'next/dynamic'
const ConfirmAcceptOfferModal = dynamic(() => import('@/components/worker/ConfirmAcceptOfferModal').then(m => ({ default: m.ConfirmAcceptOfferModal })), { ssr: false })
const OfferAcceptedModal = dynamic(() => import('@/components/worker/OfferAcceptedModal').then(m => ({ default: m.OfferAcceptedModal })), { ssr: false })

type FilterStatus = 'all' | 'offered' | 'hired' | 'rejected'

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

const getStatusConfig = (status: string, t: (key: any) => string) => {
  switch (status) {
    case 'offered':
      return {
        icon: Clock,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-600',
        borderColor: 'border-amber-100',
        label: t('pending_offer')
      }
    case 'hired':
      return {
        icon: CheckCircle,
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-600',
        borderColor: 'border-emerald-100',
        label: t('accepted')
      }
    case 'rejected':
    case 'offer_expired':
      return {
        icon: XCircle,
        bgColor: 'bg-slate-100',
        textColor: 'text-slate-500',
        borderColor: 'border-slate-200',
        label: status === 'offer_expired' ? (t('offer_expired') || 'Expired') : t('declined')
      }
    default:
      return {
        icon: Clock,
        bgColor: 'bg-slate-50',
        textColor: 'text-slate-500',
        borderColor: 'border-slate-100',
        label: status
      }
  }
}

// Check if a message is a system-generated placeholder (not a real employer message)
const isSystemMessage = (msg?: string | null) =>
  !msg || msg.includes('has sent you a job offer for:') || msg.includes('received a job offer for:')

// Job Offer Detail Panel Component (Sliding Panel)
function JobOfferDetailPanel({ 
  offer, 
  onClose, 
  onAccept,
  onDecline,
  onMessage,
  processing,
  t,
  language
}: { 
  offer: DirectOfferWithDetails | null
  onClose: () => void
  onAccept: () => void
  onDecline: () => void
  onMessage: () => void
  processing: 'accept' | 'decline' | null
  t: (key: any) => string
  language: string
}) {
  if (!offer) return null

  const job = offer.job
  const employer = offer.employer

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'offered':
        return t('pending_offer')
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
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{job?.title || 'Job Offer'}</h2>
              {employer && (
                <Link 
                  href={`/employer/view-profile?id=${employer.id}`}
                  className="inline-flex items-center gap-1.5 mt-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{employer.company_name}</span>
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">
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

          {/* Employer invited you banner */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700 font-medium">
              {t('employer_sent_offer')}
            </p>
          </div>

          {/* Employer's Message */}
          {!isSystemMessage(offer.message) && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {t('employer_message') || 'Message from Employer'}
              </h3>
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div className="flex gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{offer.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {job?.description && (
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t('description')}</h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
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

          {/* Company Info */}
          {employer?.description && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('company_details') || 'About the Company'}</h3>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {employer.profile_image_url ? (
                      <img 
                        src={employer.profile_image_url} 
                        alt={employer.company_name}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                    ) : (
                      <Building2 className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{employer.company_name}</p>
                    {(employer.city || employer.country) && (
                      <p className="text-xs text-slate-500">
                        {employer.city}{employer.city && employer.country ? ', ' : ''}{employer.country ? translateCountryCode(employer.country, language as Language) : ''}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed break-words">
                  {employer.description}
                </p>
              </div>
            </div>
          )}

          {/* Offer Received Date */}
          <div className="text-center text-xs text-slate-400 pt-2">
            {t('joined') || 'Offer received'}: {new Date(offer.offered_at || offer.applied_at).toLocaleDateString(undefined, { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Fixed Action Buttons */}
      <div className="flex-shrink-0 p-6 border-t border-slate-200 bg-white">
        {offer.status === 'offered' ? (
          <div className="space-y-3">
            {/* Message Employer Button */}
            <ContactButton
              onClick={onMessage}
              data-testid="message-employer-btn"
              fullWidth
            >
              {t('contact_employer') || 'Message Employer'}
            </ContactButton>
            
            {/* Accept/Decline Buttons */}
            <ActionButtonGroup>
              <AcceptButton
                onClick={onAccept}
                disabled={processing !== null}
                isLoading={processing === 'accept'}
                loadingText={t('processing') + '...'}
                data-testid="accept-offer-panel-btn"
                className="flex-1"
              >
                {t('accept_offer')}
              </AcceptButton>
              <DeclineButton
                onClick={onDecline}
                disabled={processing !== null}
                isLoading={processing === 'decline'}
                loadingText={t('processing') + '...'}
                data-testid="decline-offer-panel-btn"
                className="flex-1"
              >
                {t('decline')}
              </DeclineButton>
            </ActionButtonGroup>
          </div>
        ) : offer.status === 'hired' ? (
          <div className="space-y-3">
          <MessageButton
            onClick={onMessage}
            data-testid="chat-employer-btn"
            fullWidth
          >
              {t('chat') || 'Chat with Employer'}
            </MessageButton>
            
          </div>
        ) : (
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-slate-100 text-slate-600 text-sm rounded-xl font-semibold hover:bg-slate-200 transition-all border border-slate-200"
          >
            {t('close')}
          </button>
        )}
      </div>
    </div>
  )
}

export default function WorkerJobOffersPage() {
  const { user, role, loading: authLoading } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  const [offers, setOffers] = useState<DirectOfferWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [panelProcessing, setPanelProcessing] = useState<'accept' | 'decline' | null>(null)
  const [selectedDetailOffer, setSelectedDetailOffer] = useState<DirectOfferWithDetails | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [displayedOffer, setDisplayedOffer] = useState<DirectOfferWithDetails | null>(null)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [confirmOffer, setConfirmOffer] = useState<DirectOfferWithDetails | null>(null)
  const [acceptedOffer, setAcceptedOffer] = useState<DirectOfferWithDetails | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    
    if (!authLoading && user && role === 'employer') {
      router.push('/employer/job-offers')
      return
    }
    
    if (user && role === 'worker') {
      loadJobOffers()
    }
  }, [user, role, authLoading])

  const loadJobOffers = async () => {
    if (!user) return

    setLoading(true)

    const workerProfile = await getWorkerProfile(user.id)
    if (!workerProfile) {
      setLoading(false)
      return
    }

    const offersWithDetails = await getDirectOffersForWorker(workerProfile.id)

    setOffers(offersWithDetails)
    setLoading(false)
  }

  const handleAcceptOffer = (offer: DirectOfferWithDetails) => {
    if (!user || !offer.job || processing) return
    if (!offer.employer) {
      alert('Employer information not available.')
      return
    }
    setConfirmOffer(offer)
  }

  const handleConfirmAcceptOffer = async () => {
    if (!confirmOffer || !confirmOffer.job) return

    const isPanel = displayedOffer?.id === confirmOffer.id
    if (isPanel) {
      setPanelProcessing('accept')
    } else {
      setProcessing(confirmOffer.id)
    }

    try {
      const result = await confirmOfferAtomic(confirmOffer.id)

      if (result.success) {
        posthog.capture('job_offer_accepted', {
          job_id: confirmOffer.job_id,
          job_title: confirmOffer.job?.title,
        })
        const accepted = confirmOffer
        setConfirmOffer(null)
        setAcceptedOffer(accepted)
        await loadJobOffers()
        if (isPanel) {
          setDisplayedOffer({ ...accepted, status: 'hired' })
        }
        if (result.hasScheduleWarning && result.scheduleConflictJobs) {
          alert(`${t('schedule_conflict_title')}: ${result.scheduleConflictJobs}`)
        }
      } else {
        setConfirmOffer(null)
        const errorKey = result.error === 'offer_expired' ? 'error_offer_expired'
          : result.error === 'no_positions_left' ? 'error_no_positions_left'
          : result.error === 'not_offered' ? 'error_not_offered'
          : 'error_generic_offer'
        alert(t(errorKey as any))
      }
    } catch (error) {
      logError('WorkerJobOffers', error, undefined, 'Error accepting job offer')
      setConfirmOffer(null)
      alert(t('error_generic_offer' as any))
    } finally {
      setProcessing(null)
      setPanelProcessing(null)
    }
  }

  const handleDeclineOffer = async (offerId: string) => {
    if (processing) return

    if (!confirm('Are you sure you want to decline this job offer?')) {
      return
    }

    setProcessing(offerId)

    try {
      const result = await declineOfferAtomic(offerId)
      if (result.success) {
        const declinedOffer = offers.find(o => o.id === offerId)
        posthog.capture('job_offer_declined', {
          job_id: declinedOffer?.job_id,
          job_title: declinedOffer?.job?.title,
        })
        alert('Job offer declined.')
        await loadJobOffers()
      } else {
        alert('Failed to decline the job offer. Please try again.')
      }
    } catch (error) {
      logError('WorkerJobOffers', error, undefined, 'Error declining job offer')
      alert('An error occurred while declining the job offer.')
    } finally {
      setProcessing(null)
    }
  }

  const handleChatWithEmployer = async (applicationId: string) => {
    try {
      const conversation = await getConversationByJobApplication(applicationId)
      if (conversation) {
        router.push(`/messages?conversationId=${conversation.id}`)
      } else {
        router.push('/messages')
      }
    } catch (error) {
      logError('WorkerJobOffers', error, undefined, 'Error getting conversation')
      router.push('/messages')
    }
  }

  const handleOpenOfferDetails = (offer: DirectOfferWithDetails) => {
    setSelectedDetailOffer(offer)
    setDisplayedOffer(offer)
    setIsPanelOpen(true)
  }

  const handleCloseOfferDetail = () => {
    setIsPanelOpen(false)
    // Keep displayedOffer for animation, clear after transition
    setTimeout(() => {
      setSelectedDetailOffer(null)
      setDisplayedOffer(null)
    }, 300)
  }

  const handlePanelAccept = () => {
    if (!displayedOffer || !displayedOffer.job || panelProcessing) return
    if (!displayedOffer.employer) {
      alert('Employer information not available.')
      return
    }
    setConfirmOffer(displayedOffer)
  }


  const handlePanelDecline = async () => {
    if (!displayedOffer || panelProcessing) return

    if (!confirm(t('decline_offer_confirm') || 'Are you sure you want to decline this job offer?')) {
      return
    }

    setPanelProcessing('decline')

    try {
      await declineOfferAtomic(displayedOffer.id)
      await loadJobOffers()
      setDisplayedOffer({ ...displayedOffer, status: 'rejected' })
    } catch (error) {
      logError('WorkerJobOffers', error, undefined, 'Error declining job offer')
      alert('An error occurred while declining the job offer.')
    } finally {
      setPanelProcessing(null)
    }
  }

  const handlePanelMessage = async () => {
    if (!displayedOffer) return
    await handleChatWithEmployer(displayedOffer.id)
  }

  const filteredOffers = offers.filter(offer => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'rejected') return ['rejected', 'offer_expired'].includes(offer.status)
    return offer.status === filterStatus
  })

  const counts = {
    all: offers.length,
    offered: offers.filter(o => o.status === 'offered').length,
    hired: offers.filter(o => o.status === 'hired').length,
    rejected: offers.filter(o => ['rejected', 'offer_expired'].includes(o.status)).length,
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar />
        <div className="flex items-center justify-center h-[70vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500 tracking-wide">{t('loading')}...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]" data-testid="job-offers-page">
      <div className={`lg:block ${isPanelOpen ? 'hidden' : 'block'}`}>
        <Navbar />
      </div>
      <ProfileTooltip />
      
      {/* Mobile Full-Screen Job Detail Panel */}
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
          {displayedOffer && (
            <JobOfferDetailPanel
              offer={displayedOffer}
              onClose={handleCloseOfferDetail}
              onAccept={handlePanelAccept}
              onDecline={handlePanelDecline}
              onMessage={handlePanelMessage}
              processing={panelProcessing}
              t={t}
              language={language}
            />
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block h-[calc(100vh-64px)]">
        <div className="flex h-full">
          {/* Filters Sidebar */}
          <div className="flex-shrink-0 w-72 xl:w-80 bg-slate-100 border-r border-slate-200 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-auto-hide">
              {/* Sidebar Header */}
              <div className="sticky top-0 bg-slate-100 z-10 px-5 py-4 border-b border-slate-200/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{t('job_offers')}</h2>
                    <p className="text-xs text-slate-500">{t('job_offers_description')}</p>
                  </div>
                </div>
              </div>

              {/* Stats/Filter Buttons */}
              <div className="p-4 space-y-2">
                {[
                  { key: 'all', icon: Mail, labelKey: 'all' },
                  { key: 'offered', icon: Clock, labelKey: 'pending_offer' },
                  { key: 'hired', icon: CheckCircle, labelKey: 'accepted' },
                  { key: 'rejected', icon: XCircle, labelKey: 'rejected' },
                ].map(({ key, icon: Icon, labelKey }) => (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(key as FilterStatus)}
                    className={`w-full group bg-white rounded-xl border p-3 text-left transition-all duration-200 ${
                      filterStatus === key
                        ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-lg'
                        : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        filterStatus === key
                          ? 'bg-blue-600'
                          : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}>
                        <Icon className={`w-4 h-4 transition-colors ${
                          filterStatus === key
                            ? 'text-white'
                            : 'text-slate-500'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 font-medium capitalize">{t(labelKey as any)}</p>
                        <p className="text-xl font-bold text-slate-800">{counts[key as keyof typeof counts]}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Offers List */}
          <div className="flex-1 min-w-0 overflow-hidden transition-all duration-300">
            <div className="h-full overflow-y-auto bg-white">
              {/* Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      {filterStatus === 'all' ? (t('all_offers' as any) || 'All Offers') : filterStatus === 'offered' ? t('pending_offer') : filterStatus === 'hired' ? t('accepted') : t('rejected')}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      <span className="font-semibold text-blue-600">{filteredOffers.length}</span> {filteredOffers.length === 1 ? 'offer' : 'offers'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Offer Cards */}
              <div className="p-6">
                {/* Action Required - Pinned Pending Direct Offers */}
                {counts.offered > 0 && (filterStatus === 'all' || filterStatus === 'offered') && (
                  <div className="mb-6">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-amber-100/60 to-orange-100/60 border-b border-amber-200/60">
                        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-sm">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-amber-900">{t('action_required')}</h3>
                          <p className="text-xs text-amber-700">{t('action_required_offers_desc')}</p>
                        </div>
                        <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                          {counts.offered}
                        </span>
                      </div>
                      {/* Pending Direct Offers */}
                      <div className="p-3 space-y-2">
                        {offers
                          .filter(o => o.status === 'offered')
                          .map((offer) => {
                            const expiresAt = offer.offer_expires_at ? new Date(offer.offer_expires_at) : null
                            const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))) : null
                            return (
                              <div
                                key={`action-${offer.id}`}
                                className="group flex items-center gap-3 p-3.5 bg-white rounded-xl border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer"
                                onClick={() => handleOpenOfferDetails(offer)}
                              >
                                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Briefcase className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-amber-700 transition-colors">
                                    {offer.job?.title || 'Job Offer'}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    <p className="text-xs text-slate-500 truncate">{offer.employer?.company_name || 'Company'}</p>
                                  </div>
                                </div>
                                {hoursLeft !== null && (
                                  <div className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${hoursLeft <= 12 ? 'text-red-600' : 'text-amber-600'}`}>
                                    <Clock className="w-3 h-3" />
                                    <span>{hoursLeft}h</span>
                                  </div>
                                )}
                                <div className="flex gap-1.5 flex-shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleAcceptOffer(offer) }}
                                    disabled={processing === offer.id}
                                    className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-semibold rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50"
                                  >
                                    {t('accept_offer')}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeclineOffer(offer.id) }}
                                    disabled={processing === offer.id}
                                    className="px-3 py-1.5 text-slate-500 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                  >
                                    {t('decline')}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {filteredOffers.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        {filterStatus === 'all' ? t('no_job_offers') : t('no_offers_in_category')}
                      </h3>
                      <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                        {filterStatus === 'all'
                          ? t('no_job_offers_description')
                          : t('no_applications_matching_filter')
                        }
                      </p>
                      {filterStatus === 'all' && (
                        <Link
                          href="/worker/jobs"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5"
                        >
                          <Briefcase className="w-4 h-4" />
                          {t('browse_jobs')}
                        </Link>
                      )}
                    </div>
                  ) : (
                    filteredOffers.map((offer, index) => {
                      const statusConfig = getStatusConfig(offer.status, t)
                      const StatusIcon = statusConfig.icon
                      
                      return (
                        <div 
                          key={offer.id}
                          data-testid={`job-offer-${offer.id}`}
                          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div 
                            className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                            onClick={() => handleOpenOfferDetails(offer)}
                            data-testid={`job-offer-card-${offer.id}`}
                          >
                            <div className="p-5">
                              {/* Header */}
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 group-hover:bg-blue-50 transition-all">
                                  <Briefcase className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h2 className="font-semibold text-slate-900 leading-tight transition-colors group-hover:text-blue-600 line-clamp-2">
                                    {offer.job?.title || 'Job Offer'}
                                  </h2>
                                  <Link 
                                    href={`/employer/view-profile?id=${offer.employer?.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 mt-1 hover:text-blue-600 transition-colors"
                                  >
                                    <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="text-sm text-slate-500 hover:text-blue-600 truncate">{offer.employer?.company_name || 'Company'}</span>
                                  </Link>
                                </div>
                              </div>
                              
                              {/* Location */}
                              {offer.job?.location_city && (
                                <div className="flex items-center gap-1.5 mt-3 text-sm text-slate-500">
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">{offer.job.location_city}{offer.job.location_country ? `, ${translateCountryCode(offer.job.location_country, language)}` : ''}</span>
                                </div>
                              )}
                              
                              {/* Tags */}
                              <div className="flex flex-wrap gap-2 mt-4">
                                {/* Status Badge */}
                                <span data-testid={`offer-status-${offer.status}`} className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor} rounded-lg text-xs font-medium`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusConfig.label}
                                </span>
                                {/* Salary */}
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                                  <Euro className="w-3 h-3" />
                                  {offer.job?.salary_range 
                                    ? t(`salary_${offer.job.salary_range}` as any) || offer.job.salary_range.replace(/_/g, ' ')
                                    : offer.job?.pay_netto && offer.job.pay_netto > 0 
                                      ? `€${offer.job.pay_netto}`
                                      : t('salary_negotiable')}
                                </span>
                                {offer.job?.accommodation_included && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                                    <Home className="w-3 h-3" />
                                  </span>
                                )}
                                {offer.job?.food_included && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                                    <Utensils className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                              
                              {/* Employer Message Preview */}
                              {!isSystemMessage(offer.message) && (
                                <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                  <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-1">{t('employer_message') || 'From employer'}</p>
                                  <p className="text-sm text-slate-600 line-clamp-2">{offer.message}</p>
                                </div>
                              )}
                              
                              {/* Click indicator */}
                              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-end">
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400 group-hover:text-blue-500 transition-colors">
                                  <ChevronRight className="w-4 h-4" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Job Offer Detail Panel */}
          <div className={`bg-white border-l border-slate-200 overflow-hidden transition-all duration-300 ${
            isPanelOpen ? 'w-[45%] xl:w-[40%]' : 'w-0'
          }`}>
            {displayedOffer && (
              <JobOfferDetailPanel
                offer={displayedOffer}
                onClose={handleCloseOfferDetail}
                onAccept={handlePanelAccept}
                onDecline={handlePanelDecline}
                onMessage={handlePanelMessage}
                processing={panelProcessing}
                t={t}
                language={language}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden px-4 pb-24 pt-3">
        {/* Mobile Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900">{t('job_offers')}</h1>
        </div>

        {/* Mobile Stats/Filter Buttons - compact horizontal pills */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {[
            { key: 'all', icon: Mail, labelKey: 'all' },
            { key: 'offered', icon: Clock, labelKey: 'pending_offer' },
            { key: 'hired', icon: CheckCircle, labelKey: 'accepted' },
            { key: 'rejected', icon: XCircle, labelKey: 'rejected' },
          ].map(({ key, icon: Icon, labelKey }) => {
            const count = counts[key as keyof typeof counts]
            const isActive = filterStatus === key

            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key as FilterStatus)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap capitalize">{t(labelKey as any)}</span>
                <span className={`ml-0.5 min-w-[1.25rem] text-center px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-tight ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Mobile Offers List */}
        <div className="space-y-3">
          {/* Action Required - Pinned Pending Direct Offers (Mobile) */}
          {counts.offered > 0 && (filterStatus === 'all' || filterStatus === 'offered') && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-100/60 to-orange-100/60 border-b border-amber-200/60">
                <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center shadow-sm">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-amber-900">{t('action_required')}</h3>
                  <p className="text-xs text-amber-700">{t('action_required_offers_desc')}</p>
                </div>
                <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                  {counts.offered}
                </span>
              </div>
              {/* Pending Direct Offers */}
              <div className="p-2.5 space-y-2">
                {offers
                  .filter(o => o.status === 'offered')
                  .map((offer) => {
                    const expiresAt = offer.offer_expires_at ? new Date(offer.offer_expires_at) : null
                    const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))) : null
                    return (
                      <div
                        key={`action-mobile-${offer.id}`}
                        className="bg-white rounded-xl border border-amber-100 p-3 cursor-pointer"
                        onClick={() => handleOpenOfferDetails(offer)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {offer.job?.title || 'Job Offer'}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <p className="text-xs text-slate-500 truncate">{offer.employer?.company_name || 'Company'}</p>
                            </div>
                          </div>
                          {hoursLeft !== null && (
                            <div className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${hoursLeft <= 12 ? 'text-red-600' : 'text-amber-600'}`}>
                              <Clock className="w-3 h-3" />
                              <span>{hoursLeft}h</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAcceptOffer(offer) }}
                            disabled={processing === offer.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-semibold rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {t('accept_offer')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeclineOffer(offer.id) }}
                            disabled={processing === offer.id}
                            className="px-3 py-2 text-slate-500 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            {t('decline')}
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
          {filteredOffers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {filterStatus === 'all' ? t('no_job_offers') : `No ${filterStatus} offers`}
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                {filterStatus === 'all' 
                  ? t('no_job_offers_description')
                  : `You don't have any ${filterStatus} job offers yet.`
                }
              </p>
              {filterStatus === 'all' && (
                <Link
                  href="/worker/jobs"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5"
                >
                  <Briefcase className="w-4 h-4" />
                  {t('browse_jobs')}
                </Link>
              )}
            </div>
          ) : (
            filteredOffers.map((offer, index) => {
              const statusConfig = getStatusConfig(offer.status, t)
              const StatusIcon = statusConfig.icon
              
              return (
                <div 
                  key={offer.id}
                  data-testid={`job-offer-mobile-${offer.id}`}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div 
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    onClick={() => handleOpenOfferDetails(offer)}
                    data-testid={`job-offer-card-mobile-${offer.id}`}
                  >
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 group-hover:bg-blue-50 transition-all">
                          <Briefcase className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="font-semibold text-slate-900 leading-tight transition-colors group-hover:text-blue-600 line-clamp-2">
                            {offer.job?.title || 'Job Offer'}
                          </h2>
                          <Link 
                            href={`/employer/view-profile?id=${offer.employer?.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 mt-1 hover:text-blue-600 transition-colors"
                          >
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-500 hover:text-blue-600 truncate">{offer.employer?.company_name || 'Company'}</span>
                          </Link>
                        </div>
                      </div>
                      
                      {/* Location */}
                      {offer.job?.location_city && (
                        <div className="flex items-center gap-1.5 mt-3 text-sm text-slate-500">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{offer.job.location_city}{offer.job.location_country ? `, ${translateCountryCode(offer.job.location_country, language)}` : ''}</span>
                        </div>
                      )}
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {/* Status Badge */}
                        <span data-testid={`offer-status-${offer.status}`} className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor} rounded-lg text-xs font-medium`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                        {/* Salary */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                          <Euro className="w-3 h-3" />
                          {offer.job?.salary_range 
                            ? t(`salary_${offer.job.salary_range}` as any) || offer.job.salary_range.replace(/_/g, ' ')
                            : offer.job?.pay_netto && offer.job.pay_netto > 0 
                              ? `€${offer.job.pay_netto}`
                              : t('salary_negotiable')}
                        </span>
                        {offer.job?.accommodation_included && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                            <Home className="w-3 h-3" />
                          </span>
                        )}
                        {offer.job?.food_included && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                            <Utensils className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      
                      {/* Message Preview */}
                      {!isSystemMessage(offer.message) && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-sm text-slate-600 line-clamp-2">{offer.message}</p>
                        </div>
                      )}
                      
                      {/* Click indicator */}
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-end">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 group-hover:text-blue-500 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Confirm Accept Modal */}
      {confirmOffer && (
        <ConfirmAcceptOfferModal
          jobTitle={confirmOffer.job?.title || 'Job Offer'}
          onConfirm={handleConfirmAcceptOffer}
          onCancel={() => setConfirmOffer(null)}
          isLoading={processing === confirmOffer.id || panelProcessing === 'accept'}
        />
      )}

      {/* Success Modal */}
      {acceptedOffer && (
        <OfferAcceptedModal
          jobTitle={acceptedOffer.job?.title || 'Job Offer'}
          locationCity={acceptedOffer.job?.location_city}
          locationCountry={acceptedOffer.job?.location_country}
          startDate={acceptedOffer.job?.start_date}
          onMessageEmployer={async () => {
            const offerId = acceptedOffer.id
            setAcceptedOffer(null)
            await handleChatWithEmployer(offerId)
          }}
          onClose={() => setAcceptedOffer(null)}
        />
      )}
    </div>
  )
}

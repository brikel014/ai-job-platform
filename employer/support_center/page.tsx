'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/useLanguage'
import { logError } from '@/lib/logger'
import { HelpCircle, MessageSquare, Bug, Lightbulb, CheckCircle, Send } from 'lucide-react'

type InquiryType = 'feedback' | 'bug' | 'question'

const INQUIRY_TYPES: { value: InquiryType; icon: React.ReactNode; labelKey: string }[] = [
  {
    value: 'feedback',
    icon: <Lightbulb className="w-5 h-5" />,
    labelKey: 'inquiry_type_feedback',
  },
  {
    value: 'bug',
    icon: <Bug className="w-5 h-5" />,
    labelKey: 'inquiry_type_bug',
  },
  {
    value: 'question',
    icon: <MessageSquare className="w-5 h-5" />,
    labelKey: 'inquiry_type_question',
  },
]

export default function SupportCenterPage() {
  const { t } = useLanguage()

  const [inquiryType, setInquiryType] = useState<InquiryType>('question')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryType, subject: subject.trim() || null, message: message.trim() }),
      })

      if (!res.ok) {
        throw new Error('Failed')
      }

      setSubmitted(true)
    } catch (err) {
      logError('SupportCenterPage', err)
      setError(t('support_send_error'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setSubmitted(false)
    setError(null)
    setSubject('')
    setMessage('')
    setInquiryType('question')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-5 h-5 text-amber-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('support_center')}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{t('support_center_description')}</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          {submitted ? (
            /* Success state */
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-600" strokeWidth={1.5} />
              </div>
              <p className="text-lg font-semibold text-slate-900">{t('support_sent_success')}</p>
              <button
                onClick={handleReset}
                className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium underline underline-offset-2"
              >
                {t('support_send_another')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">

              {/* Inquiry type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  {t('inquiry_type')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {INQUIRY_TYPES.map(({ value, icon, labelKey }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setInquiryType(value)}
                      className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
                        inquiryType === value
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={inquiryType === value ? 'text-amber-600' : 'text-slate-400'}>
                        {icon}
                      </span>
                      {t(labelKey as any)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('support_subject')}
                  <span className="ml-1 text-slate-400 font-normal">({t('optional')})</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t('support_subject_placeholder')}
                  maxLength={120}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all duration-200 text-base"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('support_message')}
                  <span className="ml-1 text-red-400">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('support_message_placeholder')}
                  required
                  rows={6}
                  maxLength={2000}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all duration-200 text-base resize-none"
                />
                <p className="mt-1 text-xs text-slate-400 text-right">{message.length}/2000</p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-colors duration-150"
              >
                {submitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? t('loading') : t('support_send')}
              </button>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}

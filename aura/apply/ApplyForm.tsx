'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'

const REQUIRED = [
  'firstName', 'lastName', 'email', 'phone', 'dob', 'country',
  'relocate', 'commit', 'physical', 'understand', 'consent',
] as const

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

type Values = {
  firstName: string
  lastName: string
  email: string
  phone: string
  dob: string
  nationality: string
  country: string
  city: string
  languages: string
  relocate: string
  commit: string
  physical: string
  housing: string
  start: string
  clinicWish: string
  understand: boolean
  consent: boolean
  website: string // honeypot — humans never see or fill this
}

const INITIAL: Values = {
  firstName: '', lastName: '', email: '', phone: '', dob: '',
  nationality: '', country: '', city: '', languages: '',
  relocate: '', commit: '', physical: '', housing: '',
  start: '', clinicWish: '', understand: false, consent: false,
  website: '',
}

function isSatisfied(values: Values, name: (typeof REQUIRED)[number]): boolean {
  const v = values[name]
  if (typeof v === 'boolean') return v
  if (name === 'email') return v.trim() !== '' && EMAIL_RE.test(v)
  return v.trim() !== ''
}

export function ApplyForm() {
  const [values, setValues] = useState<Values>(INITIAL)
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const doneCount = REQUIRED.filter((name) => isSatisfied(values, name)).length
  const pct = Math.round((doneCount / REQUIRED.length) * 100)

  const set = (name: keyof Values, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setInvalid((prev) => {
      if (!prev.has(name)) return prev
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const bad = REQUIRED.filter((name) => !isSatisfied(values, name))
    setInvalid(new Set(bad))
    if (bad.length > 0) {
      const field = formRef.current?.querySelector(`[data-field="${bad[0]}"]`)
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const input = field?.querySelector<HTMLElement>('input')
      if (input) setTimeout(() => input.focus(), 300)
      return
    }

    setSubmitting(true)
    setSubmitError(false)
    try {
      const res = await fetch('/api/aura/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: values.firstName.trim(),
          last_name: values.lastName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          date_of_birth: values.dob,
          nationality: values.nationality.trim() || null,
          country: values.country.trim(),
          city: values.city.trim() || null,
          languages: values.languages.trim() || null,
          relocate: values.relocate,
          commit_3yr: values.commit,
          physical: values.physical,
          housing: values.housing || null,
          earliest_start: values.start.trim() || null,
          clinic_wish: values.clinicWish.trim() || null,
          consent_understand: values.understand,
          consent_contact: values.consent,
          website: values.website,
        }),
      })
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
      setSubmitted(true)
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'Lead')
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (name: string, extra?: string) =>
    `field${extra ? ` ${extra}` : ''}${invalid.has(name) ? ' invalid' : ''}`

  return (
    <div className="shell">
      {/* ASIDE */}
      <aside>
        <p className="eyebrow gold">Application</p>
        <h1>Tell us about yourself.</h1>
        <p className="lead">
          No experience needed, and nothing to pay. This takes about five minutes — and
          there&apos;s no obligation.
        </p>
        <ul className="reassure">
          <li><span className="mk">✓</span><span><b>Free &amp; no obligation</b> — applying costs nothing and commits you to nothing.</span></li>
          <li><span className="mk">✓</span><span><b>A real conversation</b> — a person reads every application and replies.</span></li>
          <li><span className="mk">✓</span><span><b>Your details are private</b> — used only to contact you about the programme.</span></li>
        </ul>
        <div className="progress">
          <div className="bar"><div className="fill" style={{ width: `${pct}%` }} /></div>
          <div className="lab">{pct}% complete</div>
        </div>
      </aside>

      {/* FORM / SUCCESS */}
      <main>
        {submitted ? (
          <div className="done">
            <div className="mk">✓</div>
            <p className="eyebrow gold">Application received</p>
            <h2>Thank you — we&apos;ve got it.</h2>
            <p>
              A member of the Aura team will read your application personally and get in touch
              soon. In the meantime, there&apos;s nothing else you need to do.
            </p>
            <div className="actions">
              <Link className="btn btn-gold" href="/aura">Back to the programme</Link>
            </div>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} noValidate>
            {/* 1 · ABOUT YOU */}
            <div className="fieldset">
              <div className="fs-head"><span className="n">01</span><h2>About you</h2></div>
              <div className="grid2">
                <div className={fieldClass('firstName')} data-field="firstName">
                  <label htmlFor="a-first">First name<span className="req">*</span></label>
                  <input id="a-first" type="text" name="firstName" placeholder="Your first name" value={values.firstName} onChange={(e) => set('firstName', e.target.value)} />
                  <span className="err">Please enter your first name.</span>
                </div>
                <div className={fieldClass('lastName')} data-field="lastName">
                  <label htmlFor="a-last">Last name<span className="req">*</span></label>
                  <input id="a-last" type="text" name="lastName" placeholder="Your last name" value={values.lastName} onChange={(e) => set('lastName', e.target.value)} />
                  <span className="err">Please enter your last name.</span>
                </div>
                <div className={fieldClass('email')} data-field="email">
                  <label htmlFor="a-email">Email<span className="req">*</span></label>
                  <input id="a-email" type="email" name="email" placeholder="you@example.com" value={values.email} onChange={(e) => set('email', e.target.value)} />
                  <span className="err">Please enter a valid email.</span>
                </div>
                <div className={fieldClass('phone')} data-field="phone">
                  <label htmlFor="a-phone">Phone / WhatsApp<span className="req">*</span></label>
                  <input id="a-phone" type="tel" name="phone" placeholder="+31 6 1234 5678" value={values.phone} onChange={(e) => set('phone', e.target.value)} />
                  <span className="err">Please enter a phone number.</span>
                </div>
                <div className={fieldClass('dob')} data-field="dob">
                  <label htmlFor="a-dob">Date of birth<span className="req">*</span></label>
                  <input id="a-dob" type="date" name="dob" value={values.dob} onChange={(e) => set('dob', e.target.value)} />
                  <span className="err">Please enter your date of birth.</span>
                </div>
                <div className="field">
                  <label htmlFor="a-nationality">Nationality</label>
                  <input id="a-nationality" type="text" name="nationality" placeholder="e.g. Dutch" value={values.nationality} onChange={(e) => set('nationality', e.target.value)} />
                </div>
                <div className={fieldClass('country')} data-field="country">
                  <label htmlFor="a-country">Country of residence<span className="req">*</span></label>
                  <input id="a-country" type="text" name="country" placeholder="Where you live now" value={values.country} onChange={(e) => set('country', e.target.value)} />
                  <span className="err">Please enter your country.</span>
                </div>
                <div className="field">
                  <label htmlFor="a-city">City / town</label>
                  <input id="a-city" type="text" name="city" placeholder="Your city" value={values.city} onChange={(e) => set('city', e.target.value)} />
                </div>
                <div className="field full">
                  <label htmlFor="a-languages">Languages you speak</label>
                  <input id="a-languages" type="text" name="languages" placeholder="e.g. English, Dutch, Arabic" value={values.languages} onChange={(e) => set('languages', e.target.value)} />
                </div>
              </div>
            </div>

            {/* 2 · THE PROGRAMME */}
            <div className="fieldset">
              <div className="fs-head"><span className="n">02</span><h2>The programme</h2></div>

              <div className={fieldClass('relocate', 'full')} data-field="relocate">
                <span className="seg-label">Are you able to relocate to the Netherlands to train?<span className="req">*</span></span>
                <div className="seg">
                  <label><input type="radio" name="relocate" value="yes" checked={values.relocate === 'yes'} onChange={() => set('relocate', 'yes')} /><span className="opt">Yes</span></label>
                  <label><input type="radio" name="relocate" value="maybe" checked={values.relocate === 'maybe'} onChange={() => set('relocate', 'maybe')} /><span className="opt">Maybe — I&apos;d like to know more</span></label>
                  <label><input type="radio" name="relocate" value="no" checked={values.relocate === 'no'} onChange={() => set('relocate', 'no')} /><span className="opt">No</span></label>
                </div>
                <span className="err">Please choose an option.</span>
              </div>

              <div className={fieldClass('commit', 'full')} data-field="commit">
                <span className="seg-label">Can you commit to the full three-year training?<span className="req">*</span></span>
                <div className="seg">
                  <label><input type="radio" name="commit" value="yes" checked={values.commit === 'yes'} onChange={() => set('commit', 'yes')} /><span className="opt">Yes</span></label>
                  <label><input type="radio" name="commit" value="i_think_so" checked={values.commit === 'i_think_so'} onChange={() => set('commit', 'i_think_so')} /><span className="opt">I think so</span></label>
                  <label><input type="radio" name="commit" value="not_sure" checked={values.commit === 'not_sure'} onChange={() => set('commit', 'not_sure')} /><span className="opt">Not sure yet</span></label>
                </div>
                <span className="err">Please choose an option.</span>
              </div>

              <div className={fieldClass('physical', 'full')} data-field="physical">
                <span className="seg-label">This work is physical — are you able to stand and use your hands for long periods?<span className="req">*</span></span>
                <div className="seg">
                  <label><input type="radio" name="physical" value="yes" checked={values.physical === 'yes'} onChange={() => set('physical', 'yes')} /><span className="opt">Yes</span></label>
                  <label><input type="radio" name="physical" value="adjustments" checked={values.physical === 'adjustments'} onChange={() => set('physical', 'adjustments')} /><span className="opt">Yes, with some adjustments</span></label>
                  <label><input type="radio" name="physical" value="not_sure" checked={values.physical === 'not_sure'} onChange={() => set('physical', 'not_sure')} /><span className="opt">I&apos;m not sure</span></label>
                </div>
                <span className="hint">Massage therapy involves standing and working with your hands for much of the day. There&apos;s no wrong answer — we just want to support you well.</span>
                <span className="err">Please choose an option.</span>
              </div>

              <div className="field full">
                <span className="seg-label">Would you need help finding accommodation?</span>
                <div className="seg">
                  <label><input type="radio" name="housing" value="yes" checked={values.housing === 'yes'} onChange={() => set('housing', 'yes')} /><span className="opt">Yes, please</span></label>
                  <label><input type="radio" name="housing" value="no" checked={values.housing === 'no'} onChange={() => set('housing', 'no')} /><span className="opt">No, I have housing</span></label>
                  <label><input type="radio" name="housing" value="not_sure" checked={values.housing === 'not_sure'} onChange={() => set('housing', 'not_sure')} /><span className="opt">Not sure</span></label>
                </div>
              </div>

              <div className="grid2 gap-top">
                <div className="field">
                  <label htmlFor="a-start">Earliest you could start</label>
                  <input id="a-start" type="text" name="start" placeholder="e.g. September 2026, or 'as soon as possible'" value={values.start} onChange={(e) => set('start', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="a-clinic">Where would you like to open your clinic afterwards?</label>
                  <input id="a-clinic" type="text" name="clinicWish" placeholder="Any city or country in Europe" value={values.clinicWish} onChange={(e) => set('clinicWish', e.target.value)} />
                </div>
              </div>
            </div>

            {/* 3 · LAST THINGS */}
            <div className="fieldset">
              <div className="fs-head"><span className="n">03</span><h2>A few last things</h2></div>

              <div className={`check${invalid.has('understand') ? ' invalid' : ''}`} data-field="understand">
                <input type="checkbox" name="understand" id="c1" checked={values.understand} onChange={(e) => set('understand', e.target.checked)} />
                <label htmlFor="c1"><b>I understand this is a professional healthcare training</b> in massage therapy and physiotherapy — and not any form of other work.</label>
              </div>
              <div className={`check last${invalid.has('consent') ? ' invalid' : ''}`} data-field="consent">
                <input type="checkbox" name="consent" id="c2" checked={values.consent} onChange={(e) => set('consent', e.target.checked)} />
                <label htmlFor="c2"><b>I agree that Aura may contact me</b> about my application and store the details I&apos;ve provided for that purpose.</label>
              </div>
              {(invalid.has('understand') || invalid.has('consent')) && (
                <span className="err" style={{ display: 'block' }}>Please confirm both boxes above to continue.</span>
              )}

              {/* Honeypot — hidden from humans, bots tend to fill it */}
              <div className="hp-field" aria-hidden="true">
                <label htmlFor="a-website">Website</label>
                <input id="a-website" type="text" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set('website', e.target.value)} />
              </div>

              <div className="actions">
                <button type="submit" className="btn btn-gold" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Submit application →'}
                </button>
                <span className="note">A person will read it and reply — usually within a few days.</span>
              </div>
              {submitError && (
                <div className="submit-error" role="alert">
                  Something went wrong sending your application. Please check your connection and
                  try again — your answers are still here.
                </div>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

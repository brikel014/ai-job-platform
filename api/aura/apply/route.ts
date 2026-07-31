import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withRateLimit, RATE_LIMITS } from '@/lib/utils/rateLimit'
import { logError } from '@/lib/logger'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const RELOCATE_VALUES = ['yes', 'maybe', 'no'] as const
const COMMIT_VALUES = ['yes', 'i_think_so', 'not_sure'] as const
const PHYSICAL_VALUES = ['yes', 'adjustments', 'not_sure'] as const
const HOUSING_VALUES = ['yes', 'no', 'not_sure'] as const

// Human-readable labels for the notification email
const LABELS: Record<string, Record<string, string>> = {
  relocate: { yes: 'Yes', maybe: "Maybe — I'd like to know more", no: 'No' },
  commit_3yr: { yes: 'Yes', i_think_so: 'I think so', not_sure: 'Not sure yet' },
  physical: { yes: 'Yes', adjustments: 'Yes, with some adjustments', not_sure: "I'm not sure" },
  housing: { yes: 'Yes, please', no: 'No, I have housing', not_sure: 'Not sure' },
}

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export async function POST(request: NextRequest) {
  const rateLimitResult = withRateLimit(request, RATE_LIMITS.auraApply, 'aura-apply')
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!
  }

  try {
    const body = await request.json()

    // Honeypot: pretend success so bots don't adapt
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return NextResponse.json({ message: 'Application received' }, { status: 200 })
    }

    const firstName = optionalText(body.first_name)
    const lastName = optionalText(body.last_name)
    const email = optionalText(body.email)
    const phone = optionalText(body.phone)
    const dateOfBirth = optionalText(body.date_of_birth)
    const country = optionalText(body.country)

    const errors: string[] = []
    if (!firstName) errors.push('first_name')
    if (!lastName) errors.push('last_name')
    if (!email || !EMAIL_RE.test(email)) errors.push('email')
    if (!phone) errors.push('phone')
    if (!dateOfBirth || !DATE_RE.test(dateOfBirth) || isNaN(Date.parse(dateOfBirth))) errors.push('date_of_birth')
    if (!country) errors.push('country')
    if (!RELOCATE_VALUES.includes(body.relocate)) errors.push('relocate')
    if (!COMMIT_VALUES.includes(body.commit_3yr)) errors.push('commit_3yr')
    if (!PHYSICAL_VALUES.includes(body.physical)) errors.push('physical')
    if (body.housing != null && body.housing !== '' && !HOUSING_VALUES.includes(body.housing)) errors.push('housing')
    if (body.consent_understand !== true) errors.push('consent_understand')
    if (body.consent_contact !== true) errors.push('consent_contact')

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid or missing fields', fields: errors },
        { status: 400 }
      )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      logError('AuraApply', 'SUPABASE_SERVICE_ROLE_KEY not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const application = {
      first_name: firstName!,
      last_name: lastName!,
      email: email!,
      phone: phone!,
      date_of_birth: dateOfBirth!,
      nationality: optionalText(body.nationality),
      country: country!,
      city: optionalText(body.city),
      languages: optionalText(body.languages),
      relocate: body.relocate as string,
      commit_3yr: body.commit_3yr as string,
      physical: body.physical as string,
      housing: HOUSING_VALUES.includes(body.housing) ? (body.housing as string) : null,
      earliest_start: optionalText(body.earliest_start),
      clinic_wish: optionalText(body.clinic_wish),
      consent_understand: true,
      consent_contact: true,
    }

    // Save to DB first so the application is never lost even if Brevo fails
    const { data: saved, error: dbError } = await supabase
      .from('aura_applications')
      .insert(application)
      .select('id')
      .single()

    if (dbError) {
      logError('AuraApply', dbError, undefined, 'Failed to save application to DB')
      return NextResponse.json({ error: 'Failed to save application' }, { status: 500 })
    }

    // Notification email via Brevo (same pattern as the contact form)
    const apiKey = process.env.BREVO_API_KEY
    const notifyEmails = (process.env.AURA_NOTIFY_EMAILS || process.env.CONTACT_EMAIL || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
    const fromEmail = process.env.BREVO_SENDER_EMAIL || notifyEmails[0]

    if (!apiKey || notifyEmails.length === 0) {
      logError('AuraApply', 'Missing BREVO_API_KEY or AURA_NOTIFY_EMAILS/CONTACT_EMAIL env vars')
      // Application is saved — don't fail the request over the notification
      return NextResponse.json({ message: 'Application received' }, { status: 200 })
    }

    const row = (label: string, value: string | null) =>
      `<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">${label}</td><td style="padding:8px;border:1px solid #e2e8f0">${value ? escapeHtml(value) : '—'}</td></tr>`

    const htmlContent = `
      <h2>New Aura Europe application</h2>
      <table style="border-collapse:collapse;width:100%">
        ${row('First name', application.first_name)}
        ${row('Last name', application.last_name)}
        ${row('Email', application.email)}
        ${row('Phone / WhatsApp', application.phone)}
        ${row('Date of birth', application.date_of_birth)}
        ${row('Nationality', application.nationality)}
        ${row('Country of residence', application.country)}
        ${row('City / town', application.city)}
        ${row('Languages', application.languages)}
        ${row('Can relocate to the Netherlands', LABELS.relocate[application.relocate])}
        ${row('Can commit to 3-year training', LABELS.commit_3yr[application.commit_3yr])}
        ${row('Able to do physical work', LABELS.physical[application.physical])}
        ${row('Needs accommodation', application.housing ? LABELS.housing[application.housing] : null)}
        ${row('Earliest start', application.earliest_start)}
        ${row('Clinic wish (after qualifying)', application.clinic_wish)}
        ${row('Understands the training', 'Yes')}
        ${row('Consents to contact & storage', 'Yes')}
      </table>
    `

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: 'Stellio – Aura Applications', email: fromEmail },
        to: notifyEmails.map((e) => ({ email: e })),
        replyTo: { email: application.email, name: `${application.first_name} ${application.last_name}` },
        subject: `New Aura application — ${application.first_name} ${application.last_name}`,
        htmlContent,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      logError('AuraApply', error, undefined, 'Brevo error')
      // Application is already saved in DB — still a success for the applicant
      return NextResponse.json({ message: 'Application received' }, { status: 200 })
    }

    if (saved?.id) {
      await supabase
        .from('aura_applications')
        .update({ email_sent: true })
        .eq('id', saved.id)
    }

    return NextResponse.json({ message: 'Application received' }, { status: 200 })
  } catch (error) {
    logError('AuraApply', error, undefined, 'Aura application error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

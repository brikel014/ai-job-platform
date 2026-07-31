import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { logError } from '@/lib/logger'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(request: NextRequest) {
  try {
    const { inquiryType, subject, message, role } = await request.json()

    if (!message || !inquiryType) {
      return NextResponse.json({ error: 'Inquiry type and message are required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.email || ''

    // Load profile for display name — try employer first, then worker
    const { data: employerProfile } = await supabase
      .from('employer_profiles')
      .select('company_name, contact_name')
      .eq('user_id', user.id)
      .maybeSingle()

    let companyName: string
    let contactName: string | null

    if (employerProfile) {
      companyName = employerProfile.company_name || email
      contactName = employerProfile.contact_name || null
    } else {
      const { data: workerProfile } = await supabase
        .from('worker_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle()
      contactName = workerProfile?.full_name || null
      companyName = contactName || email
    }

    // contact_inquiries is service-role-only (RLS with no policies): keep the
    // user-scoped `supabase` client for auth + profile reads above, but write
    // the inquiry with the service role key.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      logError('SupportForm', 'SUPABASE_SERVICE_ROLE_KEY not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Save to DB first so the submission is never lost even if Brevo fails
    const { data: inquiry, error: dbError } = await admin
      .from('contact_inquiries')
      .insert({
        company_name: companyName,
        contact_name: contactName,
        email,
        inquiry_type: inquiryType,
        subject: subject || null,
        message,
      })
      .select('id')
      .single()

    if (dbError) {
      logError('SupportForm', dbError, { userId: user.id }, 'Failed to save support inquiry to DB')
    }

    const apiKey = process.env.BREVO_API_KEY
    const toEmail = process.env.CONTACT_EMAIL
    const fromEmail = process.env.BREVO_SENDER_EMAIL || toEmail

    if (!apiKey || !toEmail) {
      logError('SupportForm', 'Missing BREVO_API_KEY or CONTACT_EMAIL env vars')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const typeLabel = inquiryType === 'bug' ? 'Bug Report' : inquiryType === 'feedback' ? 'Feedback' : 'General Question'

    const htmlContent = `
      <h2>New support inquiry — ${typeLabel}</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">From</td><td style="padding:8px;border:1px solid #e2e8f0">${role === 'worker' ? 'Worker' : 'Employer'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Type</td><td style="padding:8px;border:1px solid #e2e8f0">${typeLabel}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">${role === 'worker' ? 'Name' : 'Company'}</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(companyName)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Contact</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(contactName || '—')}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Email</td><td style="padding:8px;border:1px solid #e2e8f0"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Subject</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(subject || '—')}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Message</td><td style="padding:8px;border:1px solid #e2e8f0;white-space:pre-wrap">${escapeHtml(message)}</td></tr>
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
        sender: { name: 'Stellio Support', email: fromEmail },
        to: [{ email: toEmail }],
        replyTo: { email, name: contactName || companyName },
        subject: `[${typeLabel}] ${escapeHtml(subject || 'No subject')} — ${escapeHtml(companyName)}`,
        htmlContent,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      logError('SupportForm', error, { userId: user.id }, 'Brevo error')
      // Inquiry already saved in DB — don't return an error to the user
      return NextResponse.json({ message: 'Inquiry sent successfully' }, { status: 200 })
    }

    // Mark email as sent in DB
    if (inquiry?.id) {
      await admin
        .from('contact_inquiries')
        .update({ email_sent: true })
        .eq('id', inquiry.id)
    }

    return NextResponse.json({ message: 'Inquiry sent successfully' }, { status: 200 })
  } catch (error) {
    logError('SupportForm', error, undefined, 'Support form error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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
    const { companyName, contactName, email, phone, message } = await request.json()

    if (!email || !companyName) {
      return NextResponse.json({ error: 'Company name and email are required' }, { status: 400 })
    }

    // contact_inquiries is service-role-only (RLS with no policies), so this
    // route writes with the service role key, never the anon client.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      logError('ContactForm', 'SUPABASE_SERVICE_ROLE_KEY not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Save to DB first so the lead is never lost even if Brevo fails
    const { data: inquiry, error: dbError } = await supabase
      .from('contact_inquiries')
      .insert({
        company_name: companyName,
        contact_name: contactName || null,
        email,
        phone: phone || null,
        message: message || null,
      })
      .select('id')
      .single()
    if (dbError) {
      logError('ContactForm', dbError, undefined, 'Failed to save inquiry to DB')
    }

    const apiKey = process.env.BREVO_API_KEY
    const toEmail = process.env.CONTACT_EMAIL
    const fromEmail = process.env.BREVO_SENDER_EMAIL || toEmail

    if (!apiKey || !toEmail) {
      logError('ContactForm', 'Missing BREVO_API_KEY or CONTACT_EMAIL env vars')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const htmlContent = `
      <h2>New employer onboarding inquiry</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Company</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(companyName)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Contact name</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(contactName || '—')}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Email</td><td style="padding:8px;border:1px solid #e2e8f0"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Phone</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(phone || '—')}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">Message</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(message || '—')}</td></tr>
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
        sender: { name: 'Stellio Contact Form', email: fromEmail },
        to: [{ email: toEmail }],
        replyTo: { email, name: contactName || companyName },
        subject: `New onboarding inquiry from ${escapeHtml(companyName)}`,
        htmlContent,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      logError('ContactForm', error, undefined, 'Brevo error')
      // Inquiry is already saved in DB — don't return an error to the user
      return NextResponse.json({ message: 'Inquiry sent successfully' }, { status: 200 })
    }

    // Mark email as sent in DB
    if (inquiry?.id) {
      await supabase
        .from('contact_inquiries')
        .update({ email_sent: true })
        .eq('id', inquiry.id)
    }

    return NextResponse.json({ message: 'Inquiry sent successfully' }, { status: 200 })
  } catch (error) {
    logError('ContactForm', error, undefined, 'Contact form error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

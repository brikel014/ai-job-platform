import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withRateLimit, RATE_LIMITS } from '@/lib/utils/rateLimit'

/**
 * Checks whether an email address is registered.
 * Used on the login page to distinguish "not registered" from "wrong password".
 *
 * Rate-limited to prevent enumeration abuse.
 */
export async function POST(request: NextRequest) {
  const rateLimitResult = withRateLimit(request, RATE_LIMITS.oauth, 'check-email')
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!
  }

  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Use admin API to list users and check for email match
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })

    if (error) {
      return NextResponse.json({ exists: true }) // fail-open so login still works
    }

    const found = data.users.some(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    )

    return NextResponse.json({ exists: found })
  } catch {
    return NextResponse.json({ exists: true }) // fail-open
  }
}

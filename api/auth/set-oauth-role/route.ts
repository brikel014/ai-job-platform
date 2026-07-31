import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withRateLimit, RATE_LIMITS } from '@/lib/utils/rateLimit'
import { logError } from '@/lib/logger'

/**
 * API route to set a secure HTTP-only cookie with the pending OAuth role.
 * This is called before OAuth redirect to preserve the selected role.
 * 
 * Security features:
 * - HTTP-only cookie (not accessible via JavaScript)
 * - Secure in production (HTTPS only)
 * - SameSite=Lax (CSRF protection while allowing OAuth redirect)
 * - Short expiration (5 minutes - just enough for OAuth flow)
 * - Only accepts valid role values
 * - Rate limited to prevent abuse
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = withRateLimit(request, RATE_LIMITS.oauth, 'oauth-role')
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!
  }

  try {
    const { role } = await request.json()
    
    // Validate role - only allow specific values
    if (role !== 'worker' && role !== 'employer') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "worker" or "employer".' },
        { status: 400 }
      )
    }
    
    const response = NextResponse.json({ success: true })
    
    // Set secure HTTP-only cookie
    response.cookies.set('pending_oauth_role', role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Allows cookie to be sent on OAuth redirect
      maxAge: 60 * 5, // 5 minutes - just enough for OAuth flow
      path: '/',
    })
    
    return response
  } catch (error) {
    logError('SetOAuthRole', error, undefined, 'Error setting OAuth role cookie')
    return NextResponse.json(
      { error: 'Failed to set role' },
      { status: 500 }
    )
  }
}


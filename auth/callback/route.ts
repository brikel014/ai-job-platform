import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logError } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  // Optional explicit redirect target (e.g. password reset flow). Only allow
  // same-origin relative paths to avoid open-redirect abuse.
  const nextParam = searchParams.get('next')
  const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : null

  // Read role from cookie first, fall back to query param
  const pendingRole = (
    request.cookies.get('pending_oauth_role')?.value ||
    searchParams.get('role')
  ) as 'worker' | 'employer' | null

  // Handle OAuth provider errors (e.g. user denied access, account linking issues)
  if (errorParam) {
    logError('AuthCallback', errorParam, undefined, `OAuth provider error: ${errorDescription}`)
    const msg = encodeURIComponent(errorDescription || errorParam)
    const response = NextResponse.redirect(new URL(`/login?error=${msg}`, request.url))
    response.cookies.delete('pending_oauth_role')
    return response
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Get user to check if they need role assignment
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // If a `next` target was provided (e.g. password reset), honor it and
        // skip the role-based redirect entirely. The session is now established.
        if (safeNext) {
          const response = NextResponse.redirect(new URL(safeNext, request.url))
          response.cookies.delete('pending_oauth_role')
          return response
        }

        let userRole = user.user_metadata?.role

        // If user doesn't have a role, set it from cookie/query param
        if (pendingRole && !userRole) {
          if (pendingRole === 'worker' || pendingRole === 'employer') {
            const { error: updateError } = await supabase.auth.updateUser({
              data: { role: pendingRole }
            })
            if (!updateError) {
              userRole = pendingRole
            } else {
              logError('AuthCallback', updateError, undefined, 'Failed to update user role')
            }
          }
        }

        // Create response with redirect
        let redirectUrl: string
        if (userRole === 'worker') {
          redirectUrl = '/worker/jobs'
        } else if (userRole === 'employer') {
          const { data: profile } = await supabase
            .from('employer_profiles')
            .select('company_name')
            .eq('id', user.id)
            .maybeSingle()
          redirectUrl = profile?.company_name ? '/employer/overview' : '/employer/profile'
        } else {
          // No role set - redirect to signup so they can pick a role
          redirectUrl = '/signup'
        }

        const response = NextResponse.redirect(new URL(redirectUrl, request.url))
        response.cookies.delete('pending_oauth_role')
        return response
      }
    } else {
      logError('AuthCallback', error, undefined, 'Error exchanging code for session')
      const msg = encodeURIComponent(error.message)
      const response = NextResponse.redirect(new URL(`/login?error=${msg}`, request.url))
      response.cookies.delete('pending_oauth_role')
      return response
    }
  }

  // No code provided - redirect to login with error
  const response = NextResponse.redirect(new URL('/login?error=Authentication+failed.+Please+try+again.', request.url))
  response.cookies.delete('pending_oauth_role')
  return response
}

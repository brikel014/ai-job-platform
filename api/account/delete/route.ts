import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { withRateLimit, RATE_LIMITS } from '@/lib/utils/rateLimit'
import { logError } from '@/lib/logger'

/**
 * API route to delete a user's account and all associated data.
 * 
 * This uses the service role key to:
 * 1. Delete all user-related data from tables (respecting foreign key constraints)
 * 2. Delete the user from auth.users
 * 
 * Security:
 * - Requires authenticated user
 * - Only allows users to delete their own account
 * - Requires password confirmation for email/password users
 * - Rate limited to prevent abuse
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = withRateLimit(request, RATE_LIMITS.accountDelete, 'account-delete')
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!
  }

  try {
    // Get the authenticated user from the request
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    const { password, confirmText } = await request.json()

    // Require user to type "DELETE" to confirm
    if (confirmText !== 'DELETE') {
      return NextResponse.json(
        { error: 'Please type DELETE to confirm account deletion.' },
        { status: 400 }
      )
    }

    // For email/password users, verify their password first
    const hasEmailIdentity = user.identities?.some(
      (identity) => identity.provider === 'email'
    )

    if (hasEmailIdentity && user.email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password || '',
      })

      if (signInError) {
        return NextResponse.json(
          { error: 'Incorrect password. Please verify your password.' },
          { status: 400 }
        )
      }
    }

    // Create admin client with service role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      logError('AccountDelete', 'SUPABASE_SERVICE_ROLE_KEY not configured')
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const userId = user.id

    // Delete all user data in a single transaction via Postgres function.
    // CASCADE handles downstream tables; worker_experience is preserved (job_id SET NULL).
    try {
      const { data: cleanupInfo, error: rpcError } = await adminClient.rpc('delete_user_account', {
        p_user_id: userId,
      })

      if (rpcError) {
        logError('AccountDelete', rpcError, undefined, 'Error in delete_user_account RPC')
        return NextResponse.json(
          { error: 'Failed to delete account data. Please contact support.' },
          { status: 500 }
        )
      }

      // Clean up storage files (best-effort — orphaned files are not a data integrity issue)
      try {
        // Delete avatar image
        await adminClient.storage.from('avatars').remove([`${userId}/avatar.jpg`])

        // Delete message attachments for all conversations the user was part of
        const conversationIds: string[] = cleanupInfo?.conversation_ids || []
        for (const convId of conversationIds) {
          const { data: files } = await adminClient.storage
            .from('message-attachments')
            .list(convId)
          if (files && files.length > 0) {
            const paths = files.map((f) => `${convId}/${f.name}`)
            await adminClient.storage.from('message-attachments').remove(paths)
          }
        }
      } catch (storageError) {
        // Log but don't fail the request — data is already deleted
        logError('AccountDelete', storageError, undefined, 'Storage cleanup failed (non-critical)')
      }

      // Delete the user from auth (last step so user can retry if earlier steps fail)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

      if (deleteError) {
        logError('AccountDelete', deleteError, undefined, 'Error deleting user from auth')
        return NextResponse.json(
          { error: 'Failed to delete account. Please try again or contact support.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    } catch (dbError) {
      logError('AccountDelete', dbError, undefined, 'Error deleting user data')
      return NextResponse.json(
        { error: 'Failed to delete account data. Please contact support.' },
        { status: 500 }
      )
    }
  } catch (error) {
    logError('AccountDelete', error, undefined, 'Account deletion error')
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

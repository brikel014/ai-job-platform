import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, RATE_LIMITS } from '@/lib/utils/rateLimit'
import { logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = withRateLimit(request, RATE_LIMITS.waitlist, 'waitlist')
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!
  }

  try {
    const { email, role = 'worker', source = 'landing' } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('waitlist')
      .insert({ 
        email: email.toLowerCase().trim(),
        role,
        source
      })

    if (error) {
      // Handle duplicate email
      if (error.code === '23505') {
        return NextResponse.json(
          { message: 'You\'re already on the waitlist!' },
          { status: 200 }
        )
      }
      throw error
    }

    return NextResponse.json(
      { message: 'Successfully joined the waitlist!' },
      { status: 201 }
    )
  } catch (error) {
    logError('Waitlist', error, undefined, 'Waitlist signup error')
    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 }
    )
  }
}


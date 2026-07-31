import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, RATE_LIMITS } from '@/lib/utils/rateLimit'
import { logError } from '@/lib/logger'

/**
 * Language code mapping from app language codes to Google Translate codes
 */
const LANGUAGE_MAP: Record<string, string> = {
  sr: 'sr',
  hr: 'hr',
  bs: 'bs',
  mk: 'mk',
  sl: 'sl',
  pl: 'pl',
  bg: 'bg',
  ro: 'ro',
  el: 'el',
  sq: 'sq',
  ar: 'ar',
  uk: 'uk',
  de: 'de',
  en: 'en',
}

/**
 * API route to translate message text using Google Translate free endpoint.
 * 
 * POST /api/translate
 * Body: { text: string, targetLang: string }
 * Returns: { translatedText: string }
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = withRateLimit(request, RATE_LIMITS.default, 'translate')
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!
  }

  try {
    const { text, targetLang } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "text" parameter' },
        { status: 400 }
      )
    }

    if (!targetLang || !LANGUAGE_MAP[targetLang]) {
      return NextResponse.json(
        { error: 'Missing or unsupported "targetLang" parameter' },
        { status: 400 }
      )
    }

    const googleLang = LANGUAGE_MAP[targetLang]

    // Use Google Translate free API
    const url = new URL('https://translate.googleapis.com/translate_a/single')
    url.searchParams.set('client', 'gtx')
    url.searchParams.set('sl', 'auto') // auto-detect source language
    url.searchParams.set('tl', googleLang)
    url.searchParams.set('dt', 't')
    url.searchParams.set('q', text)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    })

    if (!response.ok) {
      logError('Translate', `Google Translate API error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: 'Translation service unavailable' },
        { status: 502 }
      )
    }

    const data = await response.json()

    // Google Translate returns an array structure: [[["translated text","original text",...],...],...]
    // Extract all translated segments and join them
    let translatedText = ''
    if (Array.isArray(data) && Array.isArray(data[0])) {
      translatedText = data[0]
        .filter((segment: any) => Array.isArray(segment) && segment[0])
        .map((segment: any) => segment[0])
        .join('')
    }

    if (!translatedText) {
      return NextResponse.json(
        { error: 'Failed to parse translation result' },
        { status: 500 }
      )
    }

    return NextResponse.json({ translatedText })
  } catch (error) {
    logError('Translate', error, undefined, 'Translation error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

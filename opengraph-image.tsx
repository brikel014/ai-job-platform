import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Stellio – Find Work Fast, Connect Workers & Employers'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 100 100"
            style={{ marginRight: 16 }}
          >
            <rect width="100" height="100" rx="20" fill="white" />
            <path
              d="M30 40 L30 70 L70 70 L70 40 L60 40 L60 35 L40 35 L40 40 Z M35 45 L65 45 L65 65 L35 65 Z"
              fill="#2563eb"
            />
            <circle cx="50" cy="55" r="3" fill="white" />
          </svg>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-2px',
            }}
          >
            Stellio
          </div>
        </div>
        <div
          style={{
            fontSize: 32,
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 500,
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          Find Work Fast | Connect Workers & Employers
        </div>
        <div
          style={{
            fontSize: 22,
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          No CV needed. Apply instantly across Europe.
        </div>
      </div>
    ),
    { ...size }
  )
}

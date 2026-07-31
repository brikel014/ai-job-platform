import { ImageResponse } from 'next/og'
import { getJobPostingById } from '@/lib/db'

export const runtime = 'edge'

export const alt = 'Job listing on Stellio'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const employmentTypeLabel: Record<string, string> = {
  permanent: 'Full-time',
  fixed_term: 'Fixed Term',
  temporary: 'Temporary',
  one_day: 'One Day',
  seasonal: 'Seasonal',
  minijob: 'Mini Job',
  part_time: 'Part-time',
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await getJobPostingById(id)

  if (!job) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#2563eb',
            color: 'white',
            fontSize: 48,
            fontFamily: 'sans-serif',
          }}
        >
          Job not found – Stellio
        </div>
      ),
      { ...size }
    )
  }

  const location = [job.location_city, job.location_country].filter(Boolean).join(', ')
  const salary =
    job.pay_netto && job.pay_netto > 0
      ? `€${job.pay_netto}/mo netto`
      : job.pay_brutto && job.pay_brutto > 0
        ? `€${job.pay_brutto}/mo brutto`
        : null
  const type = employmentTypeLabel[job.job_type] ?? job.job_type

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'white',
          fontFamily: 'sans-serif',
          padding: 60,
        }}
      >
        {/* Top: type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              background: '#dbeafe',
              color: '#1d4ed8',
              fontSize: 20,
              fontWeight: 600,
              padding: '6px 16px',
              borderRadius: 8,
            }}
          >
            {type}
          </div>
          {salary && (
            <div
              style={{
                background: '#dcfce7',
                color: '#166534',
                fontSize: 20,
                fontWeight: 600,
                padding: '6px 16px',
                borderRadius: 8,
              }}
            >
              {salary}
            </div>
          )}
        </div>

        {/* Middle: title + company */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: '#111827',
              lineHeight: 1.1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {job.title}
          </div>
          <div style={{ fontSize: 28, color: '#4b5563', fontWeight: 500 }}>
            {job.company_name}
          </div>
          {location && (
            <div style={{ fontSize: 24, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {location}
            </div>
          )}
        </div>

        {/* Bottom: branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="36" height="36" viewBox="0 0 100 100">
              <rect width="100" height="100" rx="20" fill="#2563eb" />
              <path
                d="M30 40 L30 70 L70 70 L70 40 L60 40 L60 35 L40 35 L40 40 Z M35 45 L65 45 L65 65 L35 65 Z"
                fill="white"
              />
              <circle cx="50" cy="55" r="3" fill="#2563eb" />
            </svg>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2563eb' }}>Stellio</div>
          </div>
          <div style={{ fontSize: 20, color: '#9ca3af' }}>Apply now – no CV needed</div>
        </div>
      </div>
    ),
    { ...size }
  )
}

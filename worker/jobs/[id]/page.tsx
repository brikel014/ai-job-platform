import type { Metadata } from 'next'
import { getJobPostingById } from '@/lib/db'
import type { JobPosting, JobType } from '@/lib/types'
import JobDetailClient from './JobDetailClient'

// Revalidate job detail pages every 30 minutes (ISR)
export const revalidate = 1800

interface PageProps {
  params: Promise<{ id: string }>
}

function jobTypeToSchema(jobType: JobType): string {
  const map: Record<JobType, string> = {
    permanent: 'FULL_TIME',
    fixed_term: 'CONTRACTOR',
    temporary: 'TEMPORARY',
    one_day: 'TEMPORARY',
    seasonal: 'SEASONAL',
    minijob: 'PART_TIME',
    part_time: 'PART_TIME',
  }
  return map[jobType] ?? 'OTHER'
}

function buildBreadcrumbJsonLd(job: JobPosting) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://findwork.app',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Jobs',
        item: 'https://findwork.app/worker/jobs',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: job.title,
        item: `https://findwork.app/worker/jobs/${job.id}`,
      },
    ],
  }
}

function buildJobPostingJsonLd(job: JobPosting) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    identifier: {
      '@type': 'PropertyValue',
      name: job.company_name,
      value: job.id,
    },
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company_name,
      ...(job.employer_profile_image_url && { logo: job.employer_profile_image_url }),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...(job.location_city && { addressLocality: job.location_city }),
        ...(job.location_country && { addressCountry: job.location_country }),
        ...(job.location_address && { streetAddress: job.location_address }),
      },
    },
    employmentType: jobTypeToSchema(job.job_type),
    datePosted: job.created_at,
    ...(job.end_date && { validThrough: job.end_date }),
    ...(job.start_date && { jobStartDate: job.start_date }),
    ...(job.positions_available > 0 && { totalJobOpenings: job.positions_available }),
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'EUR',
      value: {
        '@type': 'QuantitativeValue',
        ...(job.pay_netto && job.pay_netto > 0
          ? { value: job.pay_netto, unitText: 'MONTH' }
          : job.pay_brutto && job.pay_brutto > 0
            ? { value: job.pay_brutto, unitText: 'MONTH' }
            : { value: 0, unitText: 'MONTH' }),
      },
    },
    directApply: true,
    url: `https://findwork.app/worker/jobs/${job.id}`,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const job = await getJobPostingById(id)

  if (!job) {
    return {
      title: 'Job Not Found | Stellio',
    }
  }

  const locationParts = [job.location_city, job.location_country].filter(Boolean).join(', ')
  const salaryPart = job.pay_netto && job.pay_netto > 0
    ? `€${job.pay_netto}/mo netto`
    : job.pay_brutto && job.pay_brutto > 0
      ? `€${job.pay_brutto}/mo brutto`
      : null

  const description = [
    `${job.title} at ${job.company_name}`,
    locationParts && `in ${locationParts}`,
    salaryPart,
    'Apply now on Stellio — no CV needed.',
  ].filter(Boolean).join('. ')

  const title = `${job.title} – ${job.company_name}${locationParts ? ` | ${locationParts}` : ''} | Stellio`
  const url = `https://findwork.app/worker/jobs/${job.id}`

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'Stellio',
      images: [
        {
          url: job.employer_profile_image_url ?? '/opengraph-image',
          width: 1200,
          height: 630,
          alt: `${job.title} at ${job.company_name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [job.employer_profile_image_url ?? '/opengraph-image'],
    },
    alternates: {
      canonical: url,
    },
    robots: {
      index: job.status === 'active' && job.visibility === 'public',
      follow: true,
    },
  }
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params
  const job = await getJobPostingById(id)

  const jsonLd = job ? buildJobPostingJsonLd(job) : null
  const breadcrumbJsonLd = job ? buildBreadcrumbJsonLd(job) : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      <JobDetailClient jobId={id} initialJob={job} />
    </>
  )
}

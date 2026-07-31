import type { MetadataRoute } from 'next'
import { getActiveJobPostings } from '@/lib/db'

// Revalidate sitemap every hour
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobs = await getActiveJobPostings()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://findwork.app',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://findwork.app/login',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://findwork.app/signup',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://findwork.app/worker/jobs',
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: 'https://findwork.app/aura',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://findwork.app/aura/apply',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]

  const jobPages: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `https://findwork.app/worker/jobs/${job.id}`,
    lastModified: new Date(job.updated_at),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...jobPages]
}

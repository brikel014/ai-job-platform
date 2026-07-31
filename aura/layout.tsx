import type { Metadata } from 'next'
import { Arimo } from 'next/font/google'
import './aura.css'

const arimo = Arimo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-arimo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Aura Europe — A paid path into a real profession',
  description:
    'Aura helps women train as professional massage and physiotherapy practitioners — paid to learn, fully supported, with no experience needed to begin. In partnership with Stellio.',
  openGraph: {
    type: 'website',
    siteName: 'Aura Europe × Stellio',
    title: 'Aura Europe — A paid path into a real profession',
    description:
      'Paid vocational training for women: become a qualified massage & physiotherapy professional. Earn around €1,500/month plus a €1,000 monthly subsidy (gross), with help finding accommodation.',
    images: [
      {
        url: '/aura/independent-woman.jpg',
        width: 1200,
        height: 800,
        alt: 'A confident, independent woman in her own wellness studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aura Europe — A paid path into a real profession',
    description:
      'Paid vocational training for women: become a qualified massage & physiotherapy professional.',
    images: ['/aura/independent-woman.jpg'],
  },
}

export default function AuraLayout({ children }: { children: React.ReactNode }) {
  return <div className={`aura-root ${arimo.variable}`}>{children}</div>
}

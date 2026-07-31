import type { Metadata } from 'next'
import Link from 'next/link'
import { ApplyForm } from './ApplyForm'

export const metadata: Metadata = {
  title: 'Apply to join Aura Europe',
  description:
    'Apply for the Aura Europe programme — paid vocational training for women in massage therapy and physiotherapy. Applying is free, no obligation, no experience needed.',
}

export default function AuraApplyPage() {
  return (
    <>
      <header className="apply-nav">
        <div className="inner">
          <Link className="brand" href="/aura">Aura Europe</Link>
          <Link className="back" href="/aura">← Back to programme</Link>
        </div>
      </header>
      <ApplyForm />
    </>
  )
}

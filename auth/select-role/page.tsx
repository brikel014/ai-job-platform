'use client'

import { useAuth } from '@/lib/auth'
import { useLanguage } from '@/lib/useLanguage'
import Navbar from '@/components/Navbar'
import { useRoleSelection } from '@/hooks/useRoleSelection'
import { RoleSelectionForm } from '@/components/auth/RoleSelectionForm'

export default function SelectRolePage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { role, setRole, error, setError, loading, handleRoleSubmit } = useRoleSelection(user?.id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleRoleSubmit()
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-slate-200 rounded-lg shadow-md p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2 text-center">
            Select Your Role
          </h1>
          <p className="text-slate-600 mb-6 text-center">
            Please choose how you'd like to use the app
          </p>

          <RoleSelectionForm
            role={role}
            onRoleChange={setRole}
            error={error}
            onErrorClear={() => setError('')}
            loading={loading}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  )
}


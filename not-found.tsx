import { FileQuestion, Home, Search, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 Visual */}
        <div className="relative mb-8">
          {/* Large 404 text */}
          <div className="text-[150px] sm:text-[180px] font-bold text-slate-100 leading-none select-none">
            404
          </div>
          {/* Icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center">
              <FileQuestion className="w-12 h-12 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
          Page not found
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. 
          It might have been moved or no longer exists.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
          
          <Link
            href="/worker/jobs"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 font-semibold rounded-lg border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
          >
            <Search className="w-5 h-5" />
            Browse Jobs
          </Link>
        </div>

        {/* Quick Links */}
        <div className="pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-500 mb-4">
            Or try one of these links:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link 
              href="/login" 
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Sign In
            </Link>
            <span className="text-slate-300">•</span>
            <Link 
              href="/signup" 
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Create Account
            </Link>
            <span className="text-slate-300">•</span>
            <Link 
              href="/worker/jobs" 
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Find Jobs
            </Link>
            <span className="text-slate-300">•</span>
            <Link 
              href="/employer/workers" 
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Find Workers
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}




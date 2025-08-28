'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (session?.user && 'id' in session.user) {
      router.push(`/dash/${(session.user as any).id}`)
    } else {
      router.push('/login')
    }
  }, [session, status, router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">DarkByte</h1>
        <p className="text-gray-300 mb-8">Discord-like Chat Application</p>
        <div className="text-white">
          {status === 'loading' ? 'Loading...' : 'Redirecting...'}
        </div>
      </div>
    </div>
  )
}

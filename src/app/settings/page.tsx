import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import SettingsClient from './settingsClient'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  return <SettingsClient />
}

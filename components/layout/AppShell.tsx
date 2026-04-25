'use client'

import { usePathname } from 'next/navigation'
import LeftSidebar from './LeftSidebar'
import MobileNav from './MobileNav'
import { AnnouncementBanner } from '@/components/common/AnnouncementBanner'

const SIDEBAR_EXCLUDED = ['/admin', '/auth']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showSidebar = !SIDEBAR_EXCLUDED.some((prefix) => pathname.startsWith(prefix))

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <>
      <LeftSidebar />
      <div className="lg:ml-64 min-h-screen pb-16 lg:pb-0">
        <AnnouncementBanner />
        {children}
      </div>
      <MobileNav />
    </>
  )
}

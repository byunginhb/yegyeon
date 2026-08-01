'use client'

import { usePathname } from 'next/navigation'
import LeftSidebar from './LeftSidebar'
import MobileNav from './MobileNav'
import MobileTopBar from './MobileTopBar'
import SiteFooter from './SiteFooter'
import { AnnouncementBanner } from '@/components/common/AnnouncementBanner'
import WelcomePopup from '@/components/common/WelcomePopup'
import TeaserMarketPopup from '@/components/common/TeaserMarketPopup'

const SIDEBAR_EXCLUDED = ['/admin', '/auth', '/tesla']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showSidebar = !SIDEBAR_EXCLUDED.some((prefix) => pathname.startsWith(prefix))

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <>
      <LeftSidebar />
      <div className="lg:ml-64 min-h-screen pb-16 lg:pb-0 flex flex-col">
        <MobileTopBar />
        <AnnouncementBanner />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
      <MobileNav />
      <WelcomePopup />
      <TeaserMarketPopup />
    </>
  )
}

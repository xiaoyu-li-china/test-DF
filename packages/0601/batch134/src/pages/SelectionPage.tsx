import WelcomeBanner from '@/components/WelcomeBanner'
import UsageGuide from '@/components/UsageGuide'
import FilterBar from '@/components/FilterBar'
import PhotoGrid from '@/components/PhotoGrid'
import StatsBar from '@/components/StatsBar'

export default function SelectionPage() {
  return (
    <div className="min-h-screen flex flex-col bg-warm-50">
      <WelcomeBanner />
      <UsageGuide />
      <FilterBar />
      <PhotoGrid />
      <StatsBar />
    </div>
  )
}

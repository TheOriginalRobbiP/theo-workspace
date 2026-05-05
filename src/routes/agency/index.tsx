import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { AgencyHomeScreen } from '@/screens/agency/agency-home-screen'

export const Route = createFileRoute('/agency/')({
  ssr: false,
  component: AgencyRoute,
})

function AgencyRoute() {
  usePageTitle('Agency')
  return <AgencyHomeScreen />
}

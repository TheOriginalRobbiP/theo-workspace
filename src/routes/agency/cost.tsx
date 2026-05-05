import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { CostScreen } from '@/screens/agency/cost-screen'

export const Route = createFileRoute('/agency/cost')({
  ssr: false,
  component: CostRoute,
})

function CostRoute() {
  usePageTitle('Agency Cost')
  return <CostScreen />
}

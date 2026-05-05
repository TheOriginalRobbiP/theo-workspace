import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { ClientsScreen } from '@/screens/agency/clients-screen'

export const Route = createFileRoute('/agency/clients')({
  ssr: false,
  component: ClientsRoute,
})

function ClientsRoute() {
  usePageTitle('Clients')
  return <ClientsScreen />
}

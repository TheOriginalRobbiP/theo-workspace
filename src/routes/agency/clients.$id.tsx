import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { ClientDetailScreen } from '@/screens/agency/client-detail-screen'

export const Route = createFileRoute('/agency/clients/$id')({
  ssr: false,
  component: ClientDetailRoute,
})

function ClientDetailRoute() {
  usePageTitle('Client')
  const params = Route.useParams() as unknown as { id: string }
  return <ClientDetailScreen id={Number(params.id)} />
}

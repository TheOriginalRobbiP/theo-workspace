import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { ProjectDetailScreen } from '@/screens/agency/project-detail-screen'

export const Route = createFileRoute('/agency/projects/$id')({
  ssr: false,
  component: ProjectDetailRoute,
})

function ProjectDetailRoute() {
  usePageTitle('Project')
  const params = Route.useParams() as unknown as { id: string }
  return <ProjectDetailScreen id={Number(params.id)} />
}

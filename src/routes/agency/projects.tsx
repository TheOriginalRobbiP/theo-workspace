import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { ProjectsScreen } from '@/screens/agency/projects-screen'

export const Route = createFileRoute('/agency/projects')({
  ssr: false,
  component: ProjectsRoute,
})

function ProjectsRoute() {
  usePageTitle('Projects')
  return <ProjectsScreen />
}

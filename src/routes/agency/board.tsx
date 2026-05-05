import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { BoardScreen } from '@/screens/agency/board-screen'

export const Route = createFileRoute('/agency/board')({
  ssr: false,
  component: BoardRoute,
})

function BoardRoute() {
  usePageTitle('Agency Board')
  return <BoardScreen />
}

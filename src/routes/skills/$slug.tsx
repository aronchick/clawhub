import { createFileRoute } from '@tanstack/react-router'
import { SkillDetailPage } from '../../components/SkillDetailPage'

export const Route = createFileRoute('/skills/$slug')({
  component: LegacySkill,
})

function LegacySkill() {
  const { slug } = Route.useParams()
  return <SkillDetailPage slug={slug} redirectToCanonical />
}

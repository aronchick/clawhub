import { createFileRoute } from '@tanstack/react-router'
import { SkillDetailPage } from '../../components/SkillDetailPage'

export const Route = createFileRoute('/$owner/$slug')({
  component: OwnerSkill,
})

function OwnerSkill() {
  const { owner, slug } = Route.useParams()
  return <SkillDetailPage slug={slug} canonicalOwner={owner} />
}

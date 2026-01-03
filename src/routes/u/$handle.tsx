import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/u/$handle')({
  component: UserProfile,
})

function UserProfile() {
  const { handle } = Route.useParams()
  const user = useQuery(api.users.getByHandle, { handle })
  const skills = useQuery(
    api.stars.listByUser,
    user ? { userId: user._id, limit: 50 } : 'skip',
  )

  if (!user) {
    return (
      <main className="section">
        <div className="card">User not found.</div>
      </main>
    )
  }

  return (
    <main className="section">
      <h1 className="section-title">@{user.handle ?? user.name}</h1>
      <p className="section-subtitle">Highlighted skills</p>
      <div className="grid">
        {(skills ?? []).length === 0 ? (
          <div className="card">No highlights yet.</div>
        ) : (
          (skills ?? []).map((skill) => (
            <Link key={skill._id} to="/skills/$slug" params={{ slug: skill.slug }} className="card">
              <h3 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                {skill.displayName}
              </h3>
              <div className="stat">⭐ {skill.stats.stars}</div>
            </Link>
          ))
        )}
      </div>
    </main>
  )
}

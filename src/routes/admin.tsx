import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/admin')({
  component: Admin,
})

function Admin() {
  const users = useQuery(api.users.list, { limit: 50 })
  const skills = useQuery(api.skills.list, { limit: 20 })
  const setRole = useMutation(api.users.setRole)
  const setApproved = useMutation(api.skills.setRedactionApproved)
  const setBatch = useMutation(api.skills.setBatch)

  if (!users) {
    return (
      <main className="section">
        <div className="card">Admin only.</div>
      </main>
    )
  }

  return (
    <main className="section">
      <h1 className="section-title">Admin console</h1>
      <p className="section-subtitle">Promote users and curate skills.</p>

      <div className="card">
        <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
          Users
        </h2>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {users.map((user) => (
            <div key={user._id} className="stat" style={{ justifyContent: 'space-between' }}>
              <span className="mono">@{user.handle ?? user.name ?? 'user'}</span>
              <select
                value={user.role ?? 'user'}
                onChange={(event) =>
                  void setRole({ userId: user._id, role: event.target.value as any })
                }
              >
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
          Skills
        </h2>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {(skills ?? []).map((skill) => (
            <div key={skill._id} className="stat" style={{ justifyContent: 'space-between' }}>
              <Link to="/skills/$slug" params={{ slug: skill.slug }}>
                {skill.displayName}
              </Link>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    void setApproved({
                      skillId: skill._id,
                      approved: !skill.badges.redactionApproved,
                    })
                  }
                >
                  {skill.badges.redactionApproved ? 'Revoke' : 'Approve'}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    void setBatch({
                      skillId: skill._id,
                      batch: skill.batch === 'highlighted' ? undefined : 'highlighted',
                    })
                  }
                >
                  {skill.batch === 'highlighted' ? 'Unhighlight' : 'Highlight'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

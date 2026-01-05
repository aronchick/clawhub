import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Package, Plus, Upload } from 'lucide-react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const me = useQuery(api.users.me)
  const mySkills = useQuery(
    api.skills.list,
    me?._id ? { ownerUserId: me._id, limit: 100 } : 'skip',
  )

  if (!me) {
    return (
      <main className="section">
        <div className="card">Sign in to access your dashboard.</div>
      </main>
    )
  }

  const skills = mySkills ?? []

  return (
    <main className="section">
      <div className="dashboard-header">
        <h1>My Skills</h1>
        <Link to="/upload" className="btn btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Upload New Skill
        </Link>
      </div>

      {skills.length === 0 ? (
        <div className="card dashboard-empty">
          <Package className="h-12 w-12 text-muted" aria-hidden="true" />
          <h2>No skills yet</h2>
          <p>Upload your first skill to share it with the community.</p>
          <Link to="/upload" className="btn btn-primary">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload a Skill
          </Link>
        </div>
      ) : (
        <div className="dashboard-grid">
          {skills.map((skill) => (
            <SkillCard key={skill._id} skill={skill} />
          ))}
        </div>
      )}
    </main>
  )
}

function SkillCard({ skill }: { skill: { _id: string; slug: string; displayName: string; description?: string; downloadCount?: number; starCount?: number; versionCount?: number } }) {
  return (
    <div className="dashboard-skill-card">
      <div className="dashboard-skill-info">
        <Link to="/skills/$slug" params={{ slug: skill.slug }} className="dashboard-skill-name">
          {skill.displayName}
        </Link>
        <span className="dashboard-skill-slug">/{skill.slug}</span>
        {skill.description && (
          <p className="dashboard-skill-description">{skill.description}</p>
        )}
        <div className="dashboard-skill-stats">
          <span>⤓ {skill.downloadCount ?? 0}</span>
          <span>★ {skill.starCount ?? 0}</span>
          <span>{skill.versionCount ?? 1} v</span>
        </div>
      </div>
      <div className="dashboard-skill-actions">
        <Link
          to="/upload"
          search={{ updateSlug: skill.slug }}
          className="btn btn-secondary btn-sm"
        >
          <Upload className="h-3 w-3" aria-hidden="true" />
          New Version
        </Link>
        <Link to="/skills/$slug" params={{ slug: skill.slug }} className="btn btn-ghost btn-sm">
          View
        </Link>
      </div>
    </div>
  )
}

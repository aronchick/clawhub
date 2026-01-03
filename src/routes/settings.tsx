import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

function Settings() {
  const me = useQuery(api.users.me)
  const updateProfile = useMutation(api.users.updateProfile)
  const deleteAccount = useMutation(api.users.deleteAccount)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!me) return
    setDisplayName(me.displayName ?? '')
    setBio(me.bio ?? '')
  }, [me])

  if (!me) {
    return (
      <main className="section">
        <div className="card">Sign in to access settings.</div>
      </main>
    )
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault()
    await updateProfile({ displayName, bio })
    setStatus('Saved.')
  }

  async function onDelete() {
    const ok = window.confirm('Soft delete your account? This cannot be undone.')
    if (!ok) return
    await deleteAccount()
  }

  return (
    <main className="section">
      <h1 className="section-title">Settings</h1>
      <form className="card" onSubmit={onSave} style={{ display: 'grid', gap: 16 }}>
        <label>
          Display name
          <input
            className="search-input"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
        <label>
          Bio
          <textarea
            className="search-input"
            rows={3}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </label>
        <button className="btn btn-primary" type="submit">
          Save
        </button>
        {status ? <div className="stat">{status}</div> : null}
      </form>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
          Danger zone
        </h2>
        <p className="section-subtitle">Soft delete your account. Skills remain public.</p>
        <button className="btn" type="button" onClick={() => void onDelete()}>
          Delete account
        </button>
      </div>
    </main>
  )
}

import { useAuthActions } from '@convex-dev/auth/react'
import { Link } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { gravatarUrl } from '../lib/gravatar'

export default function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const me = useQuery(api.users.me)

  const avatar = me?.image ?? (me?.email ? gravatarUrl(me.email) : undefined)

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" />
          ClawdHub
        </Link>
        <nav className="nav-links">
          <Link to="/upload">Upload</Link>
          <Link to="/search">Search</Link>
          {me ? <Link to="/stars">Stars</Link> : null}
          {me?.role === 'admin' || me?.role === 'moderator' ? <Link to="/admin">Admin</Link> : null}
        </nav>
        <div className="nav-actions">
          {isAuthenticated && me ? (
            <>
              <Link to="/settings" className="btn">
                <span className="mono">@{me.handle ?? me.displayName ?? 'user'}</span>
              </Link>
              <button className="btn" type="button" onClick={() => void signOut()}>
                Sign out
              </button>
              {avatar ? (
                <img
                  src={avatar}
                  alt={me.displayName ?? me.name ?? 'User avatar'}
                  style={{ width: 36, height: 36, borderRadius: '50%' }}
                />
              ) : null}
            </>
          ) : (
            <button
              className="btn btn-primary"
              type="button"
              disabled={isLoading}
              onClick={() => void signIn('github')}
            >
              Sign in with GitHub
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

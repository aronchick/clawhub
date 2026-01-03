import { useAuthActions } from '@convex-dev/auth/react'
import { Link } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { gravatarUrl } from '../lib/gravatar'
import { useThemeMode } from '../lib/theme'

export default function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const me = useQuery(api.users.me)
  const { mode, setMode } = useThemeMode()

  const avatar = me?.image ?? (me?.email ? gravatarUrl(me.email) : undefined)
  const handle = me?.handle ?? me?.displayName ?? 'user'
  const initial = (me?.displayName ?? me?.name ?? handle).charAt(0).toUpperCase()

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
          <div className="theme-toggle">
            {(['system', 'light', 'dark'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`theme-toggle-btn${mode === value ? ' is-active' : ''}`}
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
              >
                {value === 'system' ? 'System' : value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
          {isAuthenticated && me ? (
            <details className="user-menu">
              <summary className="user-menu-trigger">
                {avatar ? (
                  <img src={avatar} alt={me.displayName ?? me.name ?? 'User avatar'} />
                ) : (
                  <span className="user-menu-fallback">{initial}</span>
                )}
                <span className="mono">@{handle}</span>
                <span className="user-menu-chevron">▾</span>
              </summary>
              <div className="user-menu-panel">
                <Link to="/settings">Settings</Link>
                <button type="button" onClick={() => void signOut()}>
                  Sign out
                </button>
              </div>
            </details>
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

import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { convex } from '../convex/client'
import { UserBootstrap } from './UserBootstrap'

export function AppProviders({ children }: { children: React.ReactNode }) {
  if (typeof window === 'undefined') {
    return <>{children}</>
  }

  return (
    <ConvexAuthProvider
      client={convex}
      replaceURL={(relativeUrl) => {
        window.history.replaceState(null, '', relativeUrl)
      }}
    >
      <UserBootstrap />
      {children}
    </ConvexAuthProvider>
  )
}

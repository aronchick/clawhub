import { useMutation, useConvexAuth } from 'convex/react'
import { useEffect, useRef } from 'react'
import { api } from '../../convex/_generated/api'

export function UserBootstrap() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const ensureUser = useMutation(api.users.ensure)
  const didRun = useRef(false)

  useEffect(() => {
    if (isLoading || !isAuthenticated || didRun.current) return
    didRun.current = true
    void ensureUser()
  }, [isAuthenticated, isLoading, ensureUser])

  return null
}

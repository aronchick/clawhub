/* @vitest-environment node */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { discoverRegistryFromSite } from './discovery'

describe('discovery', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch,
    )
    await expect(discoverRegistryFromSite('https://example.com')).resolves.toBeNull()
  })

  it('parses registry config', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ registry: 'https://example.convex.site' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ) as unknown as typeof fetch,
    )
    await expect(discoverRegistryFromSite('https://example.com')).resolves.toEqual({
      apiBase: 'https://example.convex.site',
      authBase: undefined,
      minCliVersion: undefined,
    })
  })
})

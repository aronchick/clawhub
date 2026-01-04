import { parseArk, WellKnownConfigSchema } from '@clawdhub/schema'

export async function discoverRegistryFromSite(siteUrl: string) {
  const url = new URL('/.well-known/clawdhub.json', siteUrl)
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) return null
  const raw = (await response.json()) as unknown
  const parsed = parseArk(WellKnownConfigSchema, raw, 'WellKnown config')
  return {
    registry: parsed.registry,
    authBase: parsed.authBase,
  }
}

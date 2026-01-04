import { readGlobalConfig, writeGlobalConfig } from '../config.js'
import { discoverRegistryFromSite } from '../discovery.js'
import type { GlobalOpts } from './types.js'

export const DEFAULT_SITE = 'https://clawdhub.com'
export const DEFAULT_REGISTRY = 'https://clawdhub.com'

export async function resolveRegistry(opts: GlobalOpts) {
  const cfg = await readGlobalConfig()
  if (cfg?.registry && cfg.registry !== DEFAULT_REGISTRY) return cfg.registry

  const explicit = opts.registry.trim()
  if (explicit && explicit !== DEFAULT_REGISTRY) return explicit

  const discovery = await discoverRegistryFromSite(opts.site).catch(() => null)
  const discovered = discovery?.apiBase?.trim()
  return discovered || explicit || DEFAULT_REGISTRY
}

export async function getRegistry(opts: GlobalOpts, params?: { cache?: boolean }) {
  const cache = params?.cache !== false
  const registry = await resolveRegistry(opts)
  if (!cache) return registry
  const cfg = await readGlobalConfig()
  if (!cfg || !cfg.registry || cfg.registry === DEFAULT_REGISTRY) {
    await writeGlobalConfig({ registry, token: cfg?.token })
  }
  return registry
}

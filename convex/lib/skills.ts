export type ParsedSkillFrontmatter = Record<string, string>

export type SkillInstallSpec = {
  id?: string
  kind: 'brew' | 'node' | 'go' | 'uv'
  label?: string
  bins?: string[]
  formula?: string
  package?: string
  module?: string
}

export type ClawdisSkillMetadata = {
  always?: boolean
  skillKey?: string
  primaryEnv?: string
  emoji?: string
  homepage?: string
  os?: string[]
  requires?: {
    bins?: string[]
    anyBins?: string[]
    env?: string[]
    config?: string[]
  }
  install?: SkillInstallSpec[]
}

const FRONTMATTER_START = '---'

const TEXT_EXTENSIONS = new Set([
  'md',
  'mdx',
  'txt',
  'json',
  'json5',
  'yaml',
  'yml',
  'toml',
  'js',
  'cjs',
  'mjs',
  'ts',
  'tsx',
  'jsx',
  'py',
  'sh',
  'rb',
  'go',
  'rs',
  'swift',
  'kt',
  'java',
  'cs',
  'cpp',
  'c',
  'h',
  'hpp',
  'sql',
  'csv',
  'ini',
  'cfg',
  'env',
  'xml',
  'html',
  'css',
  'scss',
  'sass',
])

export function parseFrontmatter(content: string): ParsedSkillFrontmatter {
  const frontmatter: ParsedSkillFrontmatter = {}
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!normalized.startsWith(FRONTMATTER_START)) return frontmatter
  const endIndex = normalized.indexOf(`\n${FRONTMATTER_START}`, 3)
  if (endIndex === -1) return frontmatter
  const block = normalized.slice(4, endIndex)
  for (const line of block.split('\n')) {
    const match = line.match(/^([\w-]+):\s*(.*)$/)
    if (!match) continue
    const key = match[1]
    const rawValue = match[2].trim()
    if (!key || !rawValue) continue
    frontmatter[key] = stripQuotes(rawValue)
  }
  return frontmatter
}

export function getFrontmatterValue(frontmatter: ParsedSkillFrontmatter, key: string) {
  const raw = frontmatter[key]
  return typeof raw === 'string' ? raw : undefined
}

export function parseClawdisMetadata(frontmatter: ParsedSkillFrontmatter) {
  const raw = getFrontmatterValue(frontmatter, 'metadata')
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as { clawdis?: unknown }
    if (!parsed || typeof parsed !== 'object') return undefined
    const clawdis = (parsed as { clawdis?: unknown }).clawdis
    if (!clawdis || typeof clawdis !== 'object') return undefined
    const clawdisObj = clawdis as Record<string, unknown>
    const requiresRaw =
      typeof clawdisObj.requires === 'object' && clawdisObj.requires !== null
        ? (clawdisObj.requires as Record<string, unknown>)
        : undefined
    const installRaw = Array.isArray(clawdisObj.install) ? (clawdisObj.install as unknown[]) : []
    const install = installRaw
      .map((entry) => parseInstallSpec(entry))
      .filter((entry): entry is SkillInstallSpec => Boolean(entry))
    const osRaw = normalizeStringList(clawdisObj.os)

    const metadata: ClawdisSkillMetadata = {
      always: typeof clawdisObj.always === 'boolean' ? clawdisObj.always : undefined,
      emoji: typeof clawdisObj.emoji === 'string' ? clawdisObj.emoji : undefined,
      homepage: typeof clawdisObj.homepage === 'string' ? clawdisObj.homepage : undefined,
      skillKey: typeof clawdisObj.skillKey === 'string' ? clawdisObj.skillKey : undefined,
      primaryEnv: typeof clawdisObj.primaryEnv === 'string' ? clawdisObj.primaryEnv : undefined,
      os: osRaw.length > 0 ? osRaw : undefined,
      requires: requiresRaw
        ? {
            bins: normalizeStringList(requiresRaw.bins),
            anyBins: normalizeStringList(requiresRaw.anyBins),
            env: normalizeStringList(requiresRaw.env),
            config: normalizeStringList(requiresRaw.config),
          }
        : undefined,
      install: install.length > 0 ? install : undefined,
    }

    return metadata
  } catch {
    return undefined
  }
}

export function isTextFile(path: string, contentType?: string | null) {
  const trimmed = path.trim().toLowerCase()
  if (!trimmed) return false
  const parts = trimmed.split('.')
  const extension = parts.length > 1 ? (parts.at(-1) ?? '') : ''
  if (contentType) {
    if (contentType.startsWith('text/')) return true
    if (
      [
        'application/json',
        'application/xml',
        'application/yaml',
        'application/x-yaml',
        'application/toml',
        'application/javascript',
        'application/typescript',
        'application/markdown',
      ].includes(contentType)
    ) {
      return true
    }
  }
  if (extension && TEXT_EXTENSIONS.has(extension)) return true
  return false
}

export function sanitizePath(path: string) {
  const trimmed = path.trim().replace(/^\/+/, '')
  if (!trimmed || trimmed.includes('..') || trimmed.includes('\\')) {
    return null
  }
  return trimmed
}

export function buildEmbeddingText(params: {
  frontmatter: ParsedSkillFrontmatter
  readme: string
  otherFiles: Array<{ path: string; content: string }>
  maxChars?: number
}) {
  const { frontmatter, readme, otherFiles, maxChars = 200_000 } = params
  const headerParts = [
    frontmatter.name,
    frontmatter.description,
    frontmatter.homepage,
    frontmatter.website,
    frontmatter.url,
    frontmatter.emoji,
  ].filter(Boolean)
  const fileParts = otherFiles.map((file) => `# ${file.path}\n${file.content}`)
  const raw = [headerParts.join('\n'), readme, ...fileParts].filter(Boolean).join('\n\n')
  if (raw.length <= maxChars) return raw
  return raw.slice(0, maxChars)
}

function stripQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function normalizeStringList(input: unknown): string[] {
  if (!input) return []
  if (Array.isArray(input)) {
    return input.map((value) => String(value).trim()).filter(Boolean)
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  }
  return []
}

function parseInstallSpec(input: unknown): SkillInstallSpec | undefined {
  if (!input || typeof input !== 'object') return undefined
  const raw = input as Record<string, unknown>
  const kindRaw =
    typeof raw.kind === 'string' ? raw.kind : typeof raw.type === 'string' ? raw.type : ''
  const kind = kindRaw.trim().toLowerCase()
  if (kind !== 'brew' && kind !== 'node' && kind !== 'go' && kind !== 'uv') return undefined

  const spec: SkillInstallSpec = { kind: kind as SkillInstallSpec['kind'] }
  if (typeof raw.id === 'string') spec.id = raw.id
  if (typeof raw.label === 'string') spec.label = raw.label
  const bins = normalizeStringList(raw.bins)
  if (bins.length > 0) spec.bins = bins
  if (typeof raw.formula === 'string') spec.formula = raw.formula
  if (typeof raw.package === 'string') spec.package = raw.package
  if (typeof raw.module === 'string') spec.module = raw.module
  return spec
}

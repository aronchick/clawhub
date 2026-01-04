#!/usr/bin/env node
import { resolve } from 'node:path'
import { Command } from 'commander'
import { getCliBuildLabel, getCliVersion } from './cli/buildInfo.js'
import { cmdLoginFlow, cmdLogout, cmdWhoami } from './cli/commands/auth.js'
import { cmdPublish } from './cli/commands/publish.js'
import { cmdInstall, cmdList, cmdSearch, cmdUpdate } from './cli/commands/skills.js'
import { configureCommanderHelp, styleEnvBlock, styleTitle } from './cli/helpStyle.js'
import { DEFAULT_REGISTRY, DEFAULT_SITE } from './cli/registry.js'
import type { GlobalOpts } from './cli/types.js'
import { fail } from './cli/ui.js'

const program = new Command()
  .name('clawdhub')
  .description(
    `${styleTitle(`ClawdHub CLI ${getCliBuildLabel()}`)}\n${styleEnvBlock(
      'install, update, search, and publish agent skills.',
    )}`,
  )
  .version(getCliVersion(), '-V, --version', 'Show version')
  .option('--workdir <dir>', 'Working directory (default: cwd)')
  .option('--dir <dir>', 'Skills directory (relative to workdir, default: skills)')
  .option('--site <url>', 'Site base URL (for browser login)')
  .option('--registry <url>', 'Registry API base URL')
  .option('--no-input', 'Disable prompts')
  .showHelpAfterError()
  .showSuggestionAfterError()
  .addHelpText('after', styleEnvBlock('\nEnv:\n  CLAWDHUB_SITE\n  CLAWDHUB_REGISTRY\n'))

configureCommanderHelp(program)

function resolveGlobalOpts(): GlobalOpts {
  const raw = program.opts<{ workdir?: string; dir?: string; site?: string; registry?: string }>()
  const workdir = resolve(raw.workdir ?? process.cwd())
  const dir = resolve(workdir, raw.dir ?? 'skills')
  const site = raw.site ?? process.env.CLAWDHUB_SITE ?? DEFAULT_SITE
  const registry = raw.registry ?? process.env.CLAWDHUB_REGISTRY ?? DEFAULT_REGISTRY
  return { workdir, dir, site, registry }
}

function isInputAllowed() {
  const globalFlags = program.opts<{ input?: boolean }>()
  return globalFlags.input !== false
}

program
  .command('login')
  .description('Log in (opens browser or stores token)')
  .option('--token <token>', 'API token')
  .option('--label <label>', 'Token label (browser flow only)', 'CLI token')
  .option('--no-browser', 'Do not open browser (requires --token)')
  .action(async (options) => {
    const opts = resolveGlobalOpts()
    await cmdLoginFlow(opts, options, isInputAllowed())
  })

program
  .command('logout')
  .description('Remove stored token')
  .action(async () => {
    const opts = resolveGlobalOpts()
    await cmdLogout(opts)
  })

program
  .command('whoami')
  .description('Validate token')
  .action(async () => {
    const opts = resolveGlobalOpts()
    await cmdWhoami(opts)
  })

const auth = program
  .command('auth')
  .description('Authentication commands')
  .showHelpAfterError()
  .showSuggestionAfterError()

auth
  .command('login')
  .description('Log in (opens browser or stores token)')
  .option('--token <token>', 'API token')
  .option('--label <label>', 'Token label (browser flow only)', 'CLI token')
  .option('--no-browser', 'Do not open browser (requires --token)')
  .action(async (options) => {
    const opts = resolveGlobalOpts()
    await cmdLoginFlow(opts, options, isInputAllowed())
  })

auth
  .command('logout')
  .description('Remove stored token')
  .action(async () => {
    const opts = resolveGlobalOpts()
    await cmdLogout(opts)
  })

auth
  .command('whoami')
  .description('Validate token')
  .action(async () => {
    const opts = resolveGlobalOpts()
    await cmdWhoami(opts)
  })

program
  .command('search')
  .description('Vector search skills')
  .argument('<query...>', 'Query string')
  .option('--limit <n>', 'Max results', (value) => Number.parseInt(value, 10))
  .action(async (queryParts, options) => {
    const opts = resolveGlobalOpts()
    const query = queryParts.join(' ').trim()
    await cmdSearch(opts, query, options.limit)
  })

program
  .command('install')
  .description('Install into <dir>/<slug>')
  .argument('<slug>', 'Skill slug')
  .option('--version <version>', 'Version to install')
  .option('--force', 'Overwrite existing folder')
  .action(async (slug, options) => {
    const opts = resolveGlobalOpts()
    await cmdInstall(opts, slug, options.version, options.force)
  })

program
  .command('update')
  .description('Update installed skills')
  .argument('[slug]', 'Skill slug')
  .option('--all', 'Update all installed skills')
  .option('--version <version>', 'Update to specific version (single slug only)')
  .option('--force', 'Overwrite when local files do not match any version')
  .action(async (slug, options) => {
    const opts = resolveGlobalOpts()
    await cmdUpdate(opts, slug, options, isInputAllowed())
  })

program
  .command('list')
  .description('List installed skills (from lockfile)')
  .action(async () => {
    const opts = resolveGlobalOpts()
    await cmdList(opts)
  })

program
  .command('publish')
  .description('Publish skill from folder')
  .argument('<path>', 'Skill folder path')
  .option('--slug <slug>', 'Skill slug')
  .option('--name <name>', 'Display name')
  .option('--version <version>', 'Version (semver)')
  .option('--changelog <text>', 'Changelog text')
  .option('--tags <tags>', 'Comma-separated tags', 'latest')
  .action(async (folder, options) => {
    const opts = resolveGlobalOpts()
    await cmdPublish(opts, folder, options)
  })

void program.parseAsync(process.argv).catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  fail(message)
})

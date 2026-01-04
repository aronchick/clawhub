import { describe, expect, it } from 'vitest'
import { API_TOKEN_PREFIX, generateToken, hashToken } from './tokens'

describe('tokens', () => {
  it('generates token with prefix and url-safe chars', () => {
    const { token, prefix } = generateToken()
    expect(token.startsWith(API_TOKEN_PREFIX)).toBe(true)
    expect(prefix).toBe(token.slice(0, 12))
    expect(token).toMatch(/^[a-z0-9_-]+$/i)
  })

  it('hashes tokens deterministically', async () => {
    const a = await hashToken('clh_test')
    const b = await hashToken('clh_test')
    const c = await hashToken('clh_other')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })
})

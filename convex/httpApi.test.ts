/* @vitest-environment node */
import { describe, expect, it } from 'vitest'
import { __test } from './httpApi'

describe('httpApi', () => {
  it('parses publish payload', () => {
    const parsed = __test.parsePublishBody({
      slug: 'cool-skill',
      displayName: 'Cool Skill',
      version: '1.2.3',
      changelog: 'stuff',
      tags: ['latest', 'beta'],
      files: [
        {
          path: 'SKILL.md',
          size: 5,
          storageId: 'fakeStorageId',
          sha256: 'abcd',
          contentType: 'text/markdown',
        },
      ],
    })
    expect(parsed.slug).toBe('cool-skill')
    expect(parsed.tags).toEqual(['latest', 'beta'])
    expect(parsed.files[0]?.path).toBe('SKILL.md')
  })

  it('rejects invalid publish payloads', () => {
    expect(() => __test.parsePublishBody(null)).toThrow(/Invalid publish payload/i)
    expect(() =>
      __test.parsePublishBody({
        slug: 'x',
        displayName: 'X',
        version: '1.0.0',
        changelog: 'c',
        files: [],
      }),
    ).toThrow(/files required/i)
  })

  it('parses optional numbers', () => {
    expect(__test.toOptionalNumber(null)).toBeUndefined()
    expect(__test.toOptionalNumber('')).toBeUndefined()
    expect(__test.toOptionalNumber('10')).toBe(10)
    expect(__test.toOptionalNumber('nope')).toBeUndefined()
  })
})

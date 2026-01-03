import { createFileRoute } from '@tanstack/react-router'
import { useAction, useConvexAuth, useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/upload')({
  component: Upload,
})

function Upload() {
  const { isAuthenticated } = useConvexAuth()
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl)
  const publishVersion = useAction(api.skills.publishVersion)
  const [files, setFiles] = useState<File[]>([])
  const [slug, setSlug] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [tags, setTags] = useState('latest')
  const [changelog, setChangelog] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isAuthenticated) {
    return (
      <main className="section">
        <div className="card">Sign in to upload a skill.</div>
      </main>
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (files.length === 0) return
    setError(null)
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
    if (totalBytes > 50 * 1024 * 1024) {
      setError('Total size exceeds 50MB per version.')
      return
    }
    if (!files.some((file) => file.name.toLowerCase() === 'skill.md' || file.name.toLowerCase() === 'skills.md')) {
      setError('SKILL.md is required.')
      return
    }
    setStatus('Uploading files…')

    const uploaded = [] as Array<{
      path: string
      size: number
      storageId: string
      sha256: string
      contentType?: string
    }>

    for (const file of files) {
      const uploadUrl = await generateUploadUrl()
      const storageId = await uploadFile(uploadUrl, file)
      const sha256 = await hashFile(file)
      const path = file.webkitRelativePath || file.name
      uploaded.push({
        path,
        size: file.size,
        storageId,
        sha256,
        contentType: file.type || undefined,
      })
    }

    setStatus('Publishing version…')
    await publishVersion({
      slug,
      displayName,
      version,
      changelog,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      files: uploaded,
    })
    setStatus('Published.')
  }

  return (
    <main className="section">
      <h1 className="section-title">Publish a skill</h1>
      <p className="section-subtitle">Bundle SKILL.md + text files, then ship.</p>
      <form className="card" onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        <label>
          Slug
          <input
            className="search-input"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="my-skill-pack"
          />
        </label>
        <label>
          Display name
          <input
            className="search-input"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="My Skill Pack"
          />
        </label>
        <label>
          Version
          <input
            className="search-input"
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            placeholder="1.0.0"
          />
        </label>
        <label>
          Tags (comma-separated)
          <input
            className="search-input"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="latest, beta"
          />
        </label>
        <label>
          Changelog
          <textarea
            className="search-input"
            rows={3}
            value={changelog}
            onChange={(event) => setChangelog(event.target.value)}
            placeholder="What changed in this version?"
          />
        </label>
        <label>
          Files (must include SKILL.md)
          <input
            type="file"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </label>
        <button className="btn btn-primary" type="submit">
          Publish
        </button>
        {error ? <div className="stat" style={{ color: '#b84a3a' }}>{error}</div> : null}
        {status ? <div className="stat">{status}</div> : null}
      </form>
    </main>
  )
}

async function uploadFile(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!response.ok) {
    throw new Error(`Upload failed: ${await response.text()}`)
  }
  const payload = (await response.json()) as { storageId: string }
  return payload.storageId
}

async function hashFile(file: File) {
  const buffer = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  const bytes = new Uint8Array(hash)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

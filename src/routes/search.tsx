import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/search')({
  component: Search,
})

function Search() {
  const searchSkills = useAction(api.search.searchSkills)
  const [query, setQuery] = useState('')
  const [highlightedOnly, setHighlightedOnly] = useState(false)
  const [results, setResults] = useState<
    Array<{ skill: Doc<'skills'>; version: Doc<'skillVersions'> | null; score: number }>
  >([])
  const [isSearching, setIsSearching] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    setIsSearching(true)
    try {
      const data = (await searchSkills({ query, highlightedOnly })) as Array<{
        skill: Doc<'skills'>
        version: Doc<'skillVersions'> | null
        score: number
      }>
      setResults(data)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <main className="section">
      <h1 className="section-title">Search</h1>
      <p className="section-subtitle">Ask for capabilities, get skill packs.</p>
      <form onSubmit={onSubmit} className="search-bar" style={{ marginBottom: 20 }}>
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. summarize PDFs, book travel, scrape web"
        />
        <button className="btn btn-primary" type="submit" disabled={isSearching}>
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </form>
      <label className="search-filter">
        <input
          type="checkbox"
          className="search-filter-input"
          checked={highlightedOnly}
          onChange={(event) => setHighlightedOnly(event.target.checked)}
        />
        Highlighted only
      </label>

      <div className="grid" style={{ marginTop: 24 }}>
        {results.length === 0 ? (
          <div className="card">No results yet. Try a different prompt.</div>
        ) : (
          results.map((result) => (
            <Link
              key={result.skill._id}
              to="/skills/$slug"
              params={{ slug: result.skill.slug }}
              className="card"
            >
              <div className="tag">Score {(result.score ?? 0).toFixed(2)}</div>
              <h3 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                {result.skill.displayName}
              </h3>
              <p className="section-subtitle" style={{ margin: 0 }}>
                {result.skill.summary ?? 'Skill pack'}
              </p>
              {result.skill.batch === 'highlighted' ? <div className="tag">Highlighted</div> : null}
            </Link>
          ))
        )}
      </div>
    </main>
  )
}

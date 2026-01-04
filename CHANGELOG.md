# Changelog

## 0.0.2 — Unreleased
- CLI: make changelog optional for updates (`publish`, `sync`).
- Registry: allow empty changelog on updated versions.
- CLI: use `--cli-version` (free `--version` for skill semver flags).
- CLI: add `delete` / `undelete` (owner/admin) for soft deletion.
- Registry: hide soft-deleted skills from `search`, `skill`, `download` (unless restored).
- Tests: add delete/undelete coverage (unit + e2e).

## 0.0.1 — 2026-01-04
- Initial beta release of `clawdhub` CLI + `clawdhub-schema`.

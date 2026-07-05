# RecallForge

RecallForge is a local-first agent transcript search tool for AI-heavy developers, consultants, and small teams. Paste or upload Codex, Claude Code, Cursor, or OpenClaw session logs and it extracts reusable decisions, fixes, command patterns, and follow-ups into searchable memory cards.

The MVP runs entirely in the browser. No account, backend, or database is required. Users can optionally provide their own OpenAI API key in the browser to rewrite selected cards into sharper "reuse this fix" notes.

## Features

- Paste transcripts or upload `.txt`, `.md`, `.jsonl`, and `.log` files.
- Extract reusable memory cards for fixes, decisions, command patterns, and follow-ups.
- Search across cards instantly with source and type filters.
- Optional AI polish using a user-provided OpenAI API key.
- Export selected findings as Markdown for a team wiki or local knowledge base.

## Run Locally

```bash
npm install
npm run build
npm test
npm start
```

Then open `http://127.0.0.1:4173`.

## Pricing Concept

- Free: browser-only transcript import, local extraction, search, Markdown export.
- Pro: $12/month for hosted encrypted sync, multi-agent importers, scheduled indexing, AI rewrite packs, and team sharing.

## Deployment

The public MVP is deployed as a static GitHub Pages site from `web/`.

Built by North Star Holdings.

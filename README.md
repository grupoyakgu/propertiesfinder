# PropertiesFinder

An AI-powered acquisition platform for investors sourcing land and development
opportunities across Spain, built on official cadastral and planning data.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **PostgreSQL + Prisma 7** (`prisma-client` generator, `@prisma/adapter-pg`)
- **Leaflet / react-leaflet** for the interactive map (satellite, street, cadastre
  overlay, plot boundaries, planning-status overlay)
- **Claude API** (`@anthropic-ai/sdk`, model `claude-opus-4-8`) for AI investment
  analysis, with a deterministic rule-based fallback when no API key is set
- **Sede Electrónica del Catastro** official public OVC web services for live
  cadastral lookups by referencia catastral or coordinates — no scraping, no API
  key required (`src/lib/catastro.ts`)
- Custom session-cookie auth (bcrypt + JWT), no third-party auth provider

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, SESSION_SECRET, ANTHROPIC_API_KEY
npx prisma migrate dev
npx prisma db seed      # or: npx tsx prisma/seed.ts
npm run dev
```

Open http://localhost:3000.

## Environment variables

See `.env.example`. `ANTHROPIC_API_KEY` is optional — without it, the AI
Investment Analysis panel falls back to a transparent rule-based estimate
instead of failing.

## Data sources

- **Cadastral data**: `src/lib/catastro.ts` calls the free, official Sede
  Electrónica del Catastro OVC web services (`Consulta_DNPRC`,
  `Consulta_RCCOOR`). These are real government endpoints; this repo does not
  scrape or fabricate cadastral data.
- **Listings**: this demo seeds 20 illustrative sample plots across Spain
  (`prisma/seed.ts`) covering all development-potential and planning-status
  categories, since there is no public bulk feed of real for-sale land
  parcels.
- **Idealista**: Idealista does not permit scraping. Integrating live Idealista
  listings requires their official partner API and commercial credentials,
  which is out of scope for this build — the schema and search are designed so
  that integration can be added as another data source later without changing
  the UI.

## Project structure

```
prisma/schema.prisma       Plot / User / Favorite models, official cadastral + investment fields
src/lib/catastro.ts        Official Catastro OVC client
src/lib/ai.ts              Claude-powered investment analysis + rule-based fallback
src/lib/plot-query.ts      Search/filter query builder used by /api/plots
src/app/dashboard          Search panel, advanced filters, results list, map
src/app/property/[slug]    Full property detail page
src/proxy.ts               Route protection (formerly "middleware") for /dashboard and /property
```

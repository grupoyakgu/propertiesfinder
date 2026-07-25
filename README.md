# PropertiesFinder

An AI-powered acquisition platform for investors sourcing land and development
opportunities across Spain, built on official cadastral and planning data.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **PostgreSQL + Prisma 7** (`prisma-client` generator, `@prisma/adapter-pg`)
- **Leaflet / react-leaflet** for the interactive map (satellite, street, cadastre
  overlay, cadastral parcel boundaries)
- **Sede Electrónica del Catastro** official public OVC web services for live
  cadastral lookups by referencia catastral or coordinates — no scraping, no API
  key required (`src/lib/catastro.ts`)
- **Analysis Engine**: Claude-powered urban planning feasibility analysis (Sevilla
  PGOU zoning, buildability, heritage constraints, development scenarios, and a
  residual land value estimate) for liked properties, requires `ANTHROPIC_API_KEY`
  (`src/lib/analysis-engine.ts`)
- Custom session-cookie auth (bcrypt + JWT), no third-party auth provider

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, SESSION_SECRET
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000.

## Environment variables

See `.env.example`.

## Data sources

- **Cadastral data**: `src/lib/catastro.ts` calls the free, official Sede
  Electrónica del Catastro OVC web services (`Consulta_DNPRC`,
  `Consulta_RCCOOR`). These are real government endpoints; this repo does not
  scrape or fabricate cadastral data.
- **Bulk parcel import**: `scripts/import-catastro-parcels.ts` bulk-imports
  official cadastral parcels from Catastro's INSPIRE download services into
  the `CatastroParcel` table.

## Project structure

```
prisma/schema.prisma       User / CatastroParcel / Favorite / Comment / MapPreset models
src/lib/catastro.ts        Official Catastro OVC client
src/lib/catastro-parcel-query.ts  Search/filter query builder used by /api/catastro-parcels
src/lib/analysis-engine.ts  Claude-powered urban planning feasibility + residual land value engine
scripts/import-catastro-parcels.ts  Bulk INSPIRE parcel import
src/app/dashboard          Search panel, advanced filters, results list, map, Analysis Engine tab
src/app/catastro/[referencia]  Full cadastral parcel detail page
src/proxy.ts               Route protection (formerly "middleware") for /dashboard and /catastro
```

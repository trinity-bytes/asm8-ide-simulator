# Asm8 — publish (GitHub Pages, README, Figma brand page)
Objective: publish Asm8 at asm8.jahattrinidad.com on GitHub Pages, rework the README with images, and tidy the Figma file with a page of brand images.
Branch: `feature/publish` (from `develop`) · delivery: ask-on-risk · runner: Vitest + `npm run build`; Figma screenshots for design work.

## Specs

- **S1 Domain.** "me gustaria que se publique en asm8.jahattrinidad.com". Site served at `https://asm8.jahattrinidad.com/` (custom domain, so Vite `base` stays `/`).
- **S2 Hosting.** "la idea es qu eeste alojado en github-pages". Deployed by a GitHub Actions workflow to GitHub Pages of `trinity-bytes/assembler-simulator`. Assumption: deploys run from `master` (release branch) and on manual dispatch.
- **S3 README.** "el readme debe ser reworkeado apra que incluya imagenes y cosass cheveres". README gets a banner, live-site link, badges, screenshots and the existing content kept accurate.
- **S4 Figma.** "el figma se tiene que ordenar y dejar una pagina con imagenes del tipo miniatura figma, social preview y imagen github." File `AEIM1D4pIPkAoulrRZCXgg`: split the single design page into ordered pages; add a page with a Figma thumbnail (1920×1080), a social preview (Open Graph, 1200×630) and a GitHub image (repository social preview, 1280×640). Assumption: "imagen github" = repository social preview.
- **S5 Site metadata.** Social preview image exported to the site and referenced by Open Graph/Twitter meta tags in `index.html`.

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | S4 | inline | done | Figma: 11 ordered pages, `Cover & brand` page (65:7473) |
| T2 | S3, S5 | inline | done | b28787c, 4b801a2 |
| T3 | S1, S2 | inline | done (pending DNS) | 7fe9995 |

## Log

- **L1 (2026-11-12, user, original request):** "hmmm, ya pero primero me gustari que se publique en asm8.jahattrinidad.com el readme debe ser reworkeado apra que incluya imagenes y cosass cheveres el figma se tiene que ordenar y dejar una pagina con imagenes del tipo miniatura figma, social preview y imagen github. la idea es qu eeste alojado en github-pages"
- **L2 (discovery):** repo is a public fork of Schweigi/assembler-simulator; no `.github/`; Pages not enabled; `jahattrinidad.com` DNS is on Cloudflare; `asm8` subdomain has no record yet (user must add `CNAME asm8 → trinity-bytes.github.io`, DNS only). Local `master` is 31 commits ahead of `origin/master` (1.0.0 not pushed).
- **L3 (Figma):** page `IDE redesign` renamed `Desktop — States & themes`; its rows moved to pages Files & app, Rail views, Menus/overlays & hovers, Panels & Machine, Tablet, Phone, Theme checks, Worst case, Interaction states. Loose `Memory cell` component and `IP marker` moved to Components. New first page `Cover & brand`: Figma thumbnail 1920×1080 (65:7474), Open Graph 1200×630 (65:7991), GitHub social preview 1280×640 (65:8508), README themes (65:10951) and phone (65:13934) frames. Logo SVG must be scaled with `rescale` (resize keeps stroke width).
- **L4 (checks):** `npm run build`, lint, `svelte-check` pass; og-image excluded from precache (0 refs in sw.js). RDD off (global). Risk: item 5 (CI/deploy) — proof is the first Actions run.

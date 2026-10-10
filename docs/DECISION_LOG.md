# RIVALS SERIES SEASON 1 — RECONNAISSANCE & DECISION LOG

**Date:** 10 October 2026  
**Project:** Rivals Series Season 1 (RS S1) Official Website  

## 1. Discovered Source Files & Assets
1. **Governing Regulation File:**
   - Path: `d:\Projects\Rivals-Series\rules.md`
   - Content: Canonical 54 articles + Appendices A–E. Established as the single source of truth for all calculations, status transitions, roster limits, quota tracking, dispute procedures, and awards.
2. **Cover Artwork & Vector Assets:**
   - Vector: `d:\Projects\Rivals-Series\rivals_series_season_1_cover.svg`
   - Master Render: `d:\Projects\Rivals-Series\cover_artwork_s1.png`
   - Original Reference: `d:\Projects\Rivals-Series\cover_artwork_original.png`
   - Extracted Identity: Deep Midnight Tactical Navy (`#0C1728`), Competition Crimson (`#E53430`), Ivory (`#EEE6DA`), Silver Hairlines (`#7D8794`), stylized vector RS monogram, tactical pitch wireframe.
3. **Official Regulations Book Deliverables (Protected):**
   - `RS_S1_Official_Regulations_Redesigned.pdf` (40 pages)
   - `RS_S1_Official_Regulations_Redesigned.docx`
   - Status: Kept completely intact and preserved. All website code is isolated in `web/`.

## 2. Skills & Capabilities Verification
1. **Hallmark Skill:**
   - Found at `d:\Projects\Rivals-Series\.agents\skills\hallmark\SKILL.md`.
   - References inspected: anti-patterns, typography, colors, macrostructures, slop-test gates.
   - Applied: Editorial genre, Midnight Tactical theme, roman-only display headings (no italic headers), 8-state interactive components, responsive verification, anti-slop gates.
2. **Impeccable Skill:**
   - Found at `d:\Projects\Rivals-Series\.agents\skills\impeccable\SKILL.md`.
   - Executed: `.agents\skills\impeccable\scripts\impeccable.cmd context` (exit code 0).
   - Generated: `PRODUCT.md` and `DESIGN.md`.
3. **Anti-AI Writing Skill:**
   - Found at `C:\Users\Arya Rizky\.gemini\config\skills\anti-ai-writing\SKILL.md`.
   - Applied: No empty buzzwords, no em dashes (`—`), no fake metrics or testimonials, direct and authentic Indonesian copywriting.

## 3. Architecture & Stack Decisions
1. **Application Directory:** Isolated in `web/` to preserve regulations book files at the workspace root.
2. **Tech Stack:**
   - Framework: Next.js 15 (App Router) with TypeScript (strict).
   - Styling: Tailwind CSS v4 / Tailwind CSS v3 with custom design tokens from `DESIGN.md`, Lucide icons.
   - Data Layer: Dual-mode architecture:
     - Production: Supabase PostgreSQL with Row Level Security (RLS) and Storage.
     - Local/Development: Seamless local persistence engine (JSON / in-memory store) that allows instant review and testing out-of-the-box without requiring live cloud credentials.
   - Validation: Zod schemas for all forms, mutations, and API requests.
   - Testing: Vitest for pure calculation engine tests (100% rule coverage for all 15 calculation criteria).
3. **Canonical Rules Mapping:**
   - Documented in `docs/RULES_MAPPING.md`.

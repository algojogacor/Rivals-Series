# Squad Unlock and Mutual Reopen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement two squad unlocking mechanisms in Rivals Series (RS S1): (1) Self-Unlock when the opponent has not yet locked, and (2) Mutual Squad Unlock Request & Approval when both participants have locked but the phase's opening match (MD1 or MD11) is still scheduled.

**Architecture:** 
- Self-unlock directly updates `roster_phases` (`pa_locked = 0` or `pb_locked = 0`) if `both_locked === false` and the opening match is `scheduled`.
- Mutual squad unlock persists requests in a new SQLite table `squad_unlock_requests`. When the opponent approves, both `pa_locked` and `pb_locked` are reset to 0 atomically, returning both participants to draft mode.
- Audit trail events are recorded for every unlock, request, approval, rejection, and cancellation.
- UI elements in `SquadQuotaBanner.tsx` and `PendingMatchesTab.tsx` provide clear feedback, confirmation prompts, and approval controls.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript, LibSQL / SQLite, Vitest, Tailwind CSS, Lucide icons.

---

### File Structure Map
- **Schema & Migration:**
  - `web/scripts/schema.sql`: Add `squad_unlock_requests` table definition.
  - `web/scripts/migrate-squad-unlock.mjs`: Migration script to create table in local/production databases.
- **Data Types & Queries:**
  - `web/src/lib/types.ts`: Add `SquadUnlockRequest` interface.
  - `web/src/lib/db.ts`: Add `getPendingSquadUnlockRequests()`, `getSquadUnlockRequestById()`.
- **Server Actions:**
  - `web/src/lib/actions/squad_actions.ts`: Add `unlockParticipantSquadAction`, `requestSquadUnlockAction`, `respondSquadUnlockAction`, `cancelSquadUnlockAction`.
- **Testing:**
  - `web/src/lib/squad_unlock.test.ts`: Vitest test suite covering all states, permission checks, and edge cases.
- **Frontend / UI:**
  - `web/src/components/squad/SquadQuotaBanner.tsx`: Self-unlock button, request unlock button, reason modal, pending request status banner.
  - `web/src/components/control/PendingMatchesTab.tsx`: Opponent approval card for pending unlock requests.
  - `web/src/components/ControlCenterClient.tsx`: Feed pending unlock requests to tabs and badge counts.
  - `web/src/app/control/page.tsx`: Server data loader for pending unlock requests.

---

## Task 1: Database Schema & Types for `squad_unlock_requests`

- [ ] **Step 1.1: Define `SquadUnlockRequest` in `types.ts`**
  - Add interface `SquadUnlockRequest` with fields: `id`, `phase`, `requested_by`, `reason`, `status`, `responded_by`, `responded_at`, `rejection_reason`, `created_at`.
- [ ] **Step 1.2: Add SQL Table in `web/scripts/schema.sql`**
  - Add table `squad_unlock_requests` and index on `(phase, status)`.
- [ ] **Step 1.3: Create Migration Script `web/scripts/migrate-squad-unlock.mjs`**
  - Execute `CREATE TABLE IF NOT EXISTS squad_unlock_requests ...` against local db.
- [ ] **Step 1.4: Run migration script**
  - Run `node web/scripts/migrate-squad-unlock.mjs` and confirm table is created.

---

## Task 2: DB Query Helpers in `web/src/lib/db.ts`

- [ ] **Step 2.1: Add `getAllSquadUnlockRequests` and `getPendingSquadUnlockRequests`**
  - Query `squad_unlock_requests` ordered by `created_at DESC`.
  - Filter `status = 'pending_approval'`.
- [ ] **Step 2.2: Add `getSquadUnlockRequestById`**
  - Single row lookup by `id`.

---

## Task 3: Unit Tests for Squad Unlock Logic (`squad_unlock.test.ts`)

- [ ] **Step 3.1: Create `web/src/lib/squad_unlock.test.ts`**
  - Test Self-Unlock succeeds when opponent is not locked.
  - Test Self-Unlock is rejected if opponent is already locked (`both_locked = true`).
  - Test Self-Unlock is rejected if opening match (MD1 / MD11) is already played/reported.
  - Test Mutual Unlock Request creates record with `pending_approval`.
  - Test Mutual Unlock Request is rejected if opening match has already started.
  - Test Mutual Unlock Approval resets `is_locked`, `pa_locked`, `pb_locked` to 0.
  - Test Mutual Unlock Rejection updates status to `rejected` with reason and keeps squad locked.
  - Test Mutual Unlock Cancellation by requester updates status to `cancelled`.
- [ ] **Step 3.2: Run tests to observe failures (TDD Red)**
  - Run `npm test web/src/lib/squad_unlock.test.ts` and verify test failure before implementation.

---

## Task 4: Server Actions in `web/src/lib/actions/squad_actions.ts`

- [ ] **Step 4.1: Implement `unlockParticipantSquadAction(phase: number)`**
  - Verify session.
  - Fetch `phaseStatus` for `phase`.
  - Check opening match status (`MD1` for phase 1, `MD10` confirmed & `MD11` scheduled for phase 2).
  - Verify `otherLocked === false` (reject if both locked - must use mutual request).
  - Update `roster_phases` resetting `pa_locked` or `pb_locked` to 0.
  - Record audit trail.
  - Revalidate paths.
- [ ] **Step 4.2: Implement `requestSquadUnlockAction(formData: FormData)`**
  - Extract `phase`, `reason`. Validate non-empty reason.
  - Verify both participants are currently locked (`both_locked === true`).
  - Verify opening match is scheduled (`status === 'scheduled'`).
  - Check no active pending request exists for this phase.
  - Insert into `squad_unlock_requests`.
  - Record audit trail.
- [ ] **Step 4.3: Implement `respondSquadUnlockAction(params)`**
  - Verify session. Ensure session participant is the opponent of requester.
  - If approved:
    - Update `squad_unlock_requests` to `approved`.
    - Update `roster_phases` setting `is_locked = 0, pa_locked = 0, pb_locked = 0, locked_at = NULL, locked_by = NULL`.
  - If rejected:
    - Update `squad_unlock_requests` to `rejected` with `rejection_reason`.
  - Record audit trail.
- [ ] **Step 4.4: Implement `cancelSquadUnlockAction(requestId: string)`**
  - Verify session is requester.
  - Update `squad_unlock_requests` to `cancelled`.
- [ ] **Step 4.5: Re-run Unit Tests (TDD Green)**
  - Run `npm test` and verify all tests pass.

---

## Task 5: UI Integration in `SquadQuotaBanner.tsx`

- [ ] **Step 5.1: Pass unlock requests and actions into `SquadQuotaBanner.tsx`**
  - Render "Batal Kunci" button next to "Skuad Fase X Anda Sudah Terkunci" when `myLocked && !both_locked`.
  - Click triggers transition calling `unlockParticipantSquadAction`.
- [ ] **Step 5.2: Add "Ajukan Buka Kunci Skuad" when `both_locked && openingMatchScheduled`**
  - Add state for request dialog modal.
  - Form submit calls `requestSquadUnlockAction`.
- [ ] **Step 5.3: Add Pending Request Banner in `SquadQuotaBanner.tsx`**
  - If pending request by me: Show waiting banner with "Batalkan Permohonan" button.
  - If pending request by opponent: Show prompt with reason, "Setujui Buka Kunci Skuad" and "Tolak" buttons.

---

## Task 6: UI Integration in `PendingMatchesTab.tsx` & `ControlCenterClient.tsx`

- [ ] **Step 6.1: Update `page.tsx` (`/control`)**
  - Fetch pending squad unlock requests via `getPendingSquadUnlockRequests()`.
  - Pass to `ControlCenterClient`.
- [ ] **Step 6.2: Update `ControlCenterClient.tsx`**
  - Include pending squad unlock requests in "Konfirmasi" tab badge count.
  - Pass pending unlock requests to `PendingMatchesTab` and `SquadBuilderWorkbench`.
- [ ] **Step 6.3: Render unlock approval card in `PendingMatchesTab.tsx`**
  - Display alert card for opponent to review and approve/reject squad unlock request.

---

## Task 7: Full Verification & Build Check

- [ ] **Step 7.1: Run full test suite**
  - Execute `npm test` and ensure all 70+ tests pass with 0 failures.
- [ ] **Step 7.2: Run production build**
  - Execute `npm run build` and ensure clean TypeScript compilation.
- [ ] **Step 7.3: Update `worklog.md` and commit**
  - Document the implementation details, tests, and verification in `worklog.md`.

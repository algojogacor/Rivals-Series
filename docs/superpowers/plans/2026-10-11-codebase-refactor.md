# Rivals Series S1 Codebase Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor bloated monolithic files (2,269-line `actions.ts`, 1,766-line `ControlCenterClient.tsx`, 1,744-line `SquadBuilderWorkbench.tsx`, and 1,651-line `SetupWizardClient.tsx`) into clean, single-responsibility, domain-focused modules without altering any runtime behavior, UI styling, or competition rules.

**Architecture:** Decompose bloated files by responsibility:
1. Server mutations (`actions.ts`) split into domain action files (`match_actions`, `squad_actions`, `auth_actions`, `setup_actions`, `award_actions`, `season_actions`) with explicit re-exports in `actions.ts`.
2. Admin control center (`ControlCenterClient.tsx`) split into modular tab components (`MatchReportTab`, `PendingMatchesTab`, `DisputesTab`, `ProfileSettingsTab`) under `src/components/control/`.
3. Squad builder (`SquadBuilderWorkbench.tsx`) split into domain components (`SquadQuotaBanner`, `SquadSearchTab`, `SquadShortlistTab`, `SquadRosterTab`, `squad-constants.ts`) under `src/components/squad/`.
4. Setup wizard (`SetupWizardClient.tsx`) split into individual step components (`SetupStep1Player1`, `SetupStep2Invite`, `SetupStep3Player2`, `SetupStep4Roster`, `SetupStep5Kickoff`) under `src/components/setup/`.

**Tech Stack:** Next.js 16 (App Router with Turbopack), React 19, TypeScript 5, LibSQL / Turso, Vitest.

---

### Task 0: Safety Net Unit Tests for Auth & Helpers

**Files:**
- Create: `src/lib/auth.test.ts`
- Test: `npm test`

- [ ] **Step 1: Write auth unit tests**
Add test coverage for PIN hashing, PIN verification, invite token generation, invite token hashing, and lockout checks in `src/lib/auth.test.ts`.

- [ ] **Step 2: Run test suite to verify tests pass**
Run `npm test` and verify that all test files pass (now 4 test files).

---

### Task 1: Refactor `src/lib/actions.ts` (2,269 lines) into Domain Server Actions

**Files:**
- Create: `src/lib/actions/match_actions.ts`
- Create: `src/lib/actions/squad_actions.ts`
- Create: `src/lib/actions/auth_actions.ts`
- Create: `src/lib/actions/setup_actions.ts`
- Create: `src/lib/actions/award_actions.ts`
- Create: `src/lib/actions/season_actions.ts`
- Modify: `src/lib/actions.ts` (become explicit re-export barrel with `'use server'`)

- [ ] **Step 1: Extract `match_actions.ts`**
Move `submitMatchReportAction`, `confirmMatchReportAction`, `disputeMatchAction`, and `resolveDisputeAction` to `src/lib/actions/match_actions.ts`.

- [ ] **Step 2: Extract `squad_actions.ts`**
Move `addRosterCardAction`, `addEfootballRosterCardAction`, `removeRosterCardAction`, `updateRosterCardSlotAction`, `toggleShortlistCardAction`, `initializePhase2SquadAction`, `lockParticipantSquadAction`, and `lockRosterPhaseAction` to `src/lib/actions/squad_actions.ts`.

- [ ] **Step 3: Extract `auth_actions.ts`**
Move `loginParticipantAction`, `logoutParticipantAction`, `updateParticipantSettingsAction`, and `changeParticipantPinAction` to `src/lib/actions/auth_actions.ts`.

- [ ] **Step 4: Extract `setup_actions.ts`**
Move `setupPlayer1AndCreateInviteAction`, `regeneratePlayer2InviteAction`, `validateInviteTokenServer`, `setupPlayer2WithInviteAction`, `saveSetupStep1Action`, `testSystemReadinessAction`, and `completeSeasonSetupAction` to `src/lib/actions/setup_actions.ts`.

- [ ] **Step 5: Extract `award_actions.ts` & `season_actions.ts`**
Move `submitGoalNominationAction`, `lockAwardBallotAction` to `award_actions.ts`.
Move `requestSeasonResetAction`, `respondSeasonResetAction`, and `markAuditTrailSeenAction` to `season_actions.ts`.

- [ ] **Step 6: Update `src/lib/actions.ts` with explicit re-exports**
Re-export all action functions from their domain files to preserve 100% backwards compatibility for all existing callers.

- [ ] **Step 7: Verify Task 1**
Run `npm test` and `npm run build` to confirm zero compilation errors, zero broken imports, and all tests pass.

---

### Task 2: Refactor `src/components/ControlCenterClient.tsx` (1,766 lines) into Tab Modules

**Files:**
- Create: `src/components/control/control-types.ts`
- Create: `src/components/control/MatchReportTab.tsx`
- Create: `src/components/control/PendingMatchesTab.tsx`
- Create: `src/components/control/DisputesTab.tsx`
- Create: `src/components/control/ProfileSettingsTab.tsx`
- Modify: `src/components/ControlCenterClient.tsx`

- [ ] **Step 1: Create `src/components/control/control-types.ts`**
Extract `DraftGoalEvent` and any shared control center types into `control-types.ts`.

- [ ] **Step 2: Extract `MatchReportTab.tsx`**
Extract the match report form (match selection, score inputs, ET/PK inputs, goalkeeper inputs, goal scorers dynamic builder, screenshot upload, quota verification, submission button) into `MatchReportTab.tsx`.

- [ ] **Step 3: Extract `PendingMatchesTab.tsx`**
Extract pending matches list, confirmation button, and dispute modal launcher into `PendingMatchesTab.tsx`.

- [ ] **Step 4: Extract `DisputesTab.tsx`**
Extract dispute records viewer, dispute evidence display, and dispute resolution form into `DisputesTab.tsx`.

- [ ] **Step 5: Extract `ProfileSettingsTab.tsx`**
Extract profile settings form (team name, color swatch picker), change PIN form, session logout, and season reset request into `ProfileSettingsTab.tsx`.

- [ ] **Step 6: Refactor `ControlCenterClient.tsx` to orchestrate tabs**
Wire up the tab switcher and top header in `ControlCenterClient.tsx`, delegating the tab bodies to the new subcomponents.

- [ ] **Step 7: Verify Task 2**
Run `npm test` and `npm run build` to confirm zero TypeScript errors, clean compilation, and identical functionality.

---

### Task 3: Refactor `src/components/SquadBuilderWorkbench.tsx` (1,744 lines) into Squad Modules

**Files:**
- Create: `src/components/squad/squad-constants.ts`
- Create: `src/components/squad/SquadQuotaBanner.tsx`
- Create: `src/components/squad/SquadSearchTab.tsx`
- Create: `src/components/squad/SquadShortlistTab.tsx`
- Create: `src/components/squad/SquadRosterTab.tsx`
- Modify: `src/components/SquadBuilderWorkbench.tsx`

- [ ] **Step 1: Extract `squad-constants.ts`**
Move `POSITIONS`, `CARD_TYPES`, `FORMATION_SLOTS` and related helper functions to `squad-constants.ts`.

- [ ] **Step 2: Extract `SquadQuotaBanner.tsx`**
Extract the quota summary meters (total cards, trending requirement, Indonesian requirement), phase switcher, lock squad button, and phase 2 initialization button into `SquadQuotaBanner.tsx`.

- [ ] **Step 3: Extract `SquadSearchTab.tsx`**
Extract the player search input, filter pills, card grid, player detail modal triggers, and add-to-squad / shortlist handlers into `SquadSearchTab.tsx`.

- [ ] **Step 4: Extract `SquadShortlistTab.tsx`**
Extract the shortlist cards display and quick-add actions into `SquadShortlistTab.tsx`.

- [ ] **Step 5: Extract `SquadRosterTab.tsx`**
Extract the roster display (supporting both grid view and formation slot view), slot assignment dropdown, and card removal into `SquadRosterTab.tsx`.

- [ ] **Step 6: Refactor `SquadBuilderWorkbench.tsx`**
Assemble the workbench with subcomponents, keeping top-level state management and modal dialogs cohesive.

- [ ] **Step 7: Verify Task 3**
Run `npm test` and `npm run build` to verify tests pass and production build succeeds.

---

### Task 4: Refactor `src/components/SetupWizardClient.tsx` (1,651 lines) into Step Modules

**Files:**
- Create: `src/components/setup/setup-constants.ts`
- Create: `src/components/setup/SetupStep1Player1.tsx`
- Create: `src/components/setup/SetupStep2Invite.tsx`
- Create: `src/components/setup/SetupStep3Player2.tsx`
- Create: `src/components/setup/SetupStep4Roster.tsx`
- Create: `src/components/setup/SetupStep5Kickoff.tsx`
- Modify: `src/components/SetupWizardClient.tsx`

- [ ] **Step 1: Extract `setup-constants.ts`**
Extract `COLOR_SWATCHES` and setup step definitions into `setup-constants.ts`.

- [ ] **Step 2: Extract `SetupStep1Player1.tsx`**
Extract Step 1 form (Player 1 name, team name, color swatch, initial PIN, admin key validation) into `SetupStep1Player1.tsx`.

- [ ] **Step 3: Extract `SetupStep2Invite.tsx`**
Extract Step 2 (Invite link display, token copy, expiration countdown, regenerate invite button) into `SetupStep2Invite.tsx`.

- [ ] **Step 4: Extract `SetupStep3Player2.tsx`**
Extract Step 3 (Player 2 onboarding form, validation status, PIN setup) into `SetupStep3Player2.tsx`.

- [ ] **Step 5: Extract `SetupStep4Roster.tsx`**
Extract Step 4 (Phase 1 roster builder preview and verification) into `SetupStep4Roster.tsx`.

- [ ] **Step 6: Extract `SetupStep5Kickoff.tsx`**
Extract Step 5 (System readiness checklist, test run button, and complete season kickoff button) into `SetupStep5Kickoff.tsx`.

- [ ] **Step 7: Refactor `SetupWizardClient.tsx`**
Integrate the 5 steps into the wizard shell with stepper navigation and error alert banner.

- [ ] **Step 8: Verify Task 4**
Run `npm test` and `npm run build` to ensure all tests pass and production build succeeds.

---

### Task 5: Documentation, Worklog, and Verification

**Files:**
- Modify: `worklog.md`

- [ ] **Step 1: Document discoveries and non-behavioral observations in `worklog.md`**
List all files split, new folder architectures, and any code smells or dead code noted during refactoring without altering existing behavior.

- [ ] **Step 2: Run complete test suite and production build**
Run `npm test` (all unit and integration tests) and `npm run build` (full Next.js production build).

- [ ] **Step 3: Final confirmation**
Ensure git status is tidy and all changes are strictly non-breaking refactors.

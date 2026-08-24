# Agent Dashboard Onboarding UI — Revamp Process

This document captures the process behind reworking the "steps" UI on the
agent dashboard (`resources/js/pages/dashboard-agent.tsx`) — what problem we
were solving, the decisions made along the way, and what shipped. Use it as a
reference the next time this flow needs another pass, or as a template for
similar onboarding/wizard UI elsewhere in the app.

## 1. Starting point

The agent dashboard walks a new agent through onboarding: eligibility →
enrollment → XCEL training → state exam → fingerprinting → license
application → license copy upload → AHIP certification → carrier
contracting. Each stage was its own card, revealed one at a time based on
status flags from `DashboardController::agentDashboard()`. There was no
overview of the whole journey — an agent only ever saw the single card they
were currently on, with no sense of "how far along am I" or "what's coming
after this."

## 2. Iteration 1 — add a journey overview

**Goal:** give agents a sense of progress and orientation.

- Extracted the one existing step-indicator pattern (numbered circles +
  connecting lines, previously hand-rolled inside
  `contracting-and-sales-training-card.tsx`) into a reusable component.
- Added a "Your onboarding journey" panel above the card stack on
  `dashboard-agent.tsx`, showing all 8 stages as numbered circles (done /
  current / upcoming), driven by the same status props already passed to the
  page — no backend changes needed.
- Reused the same tracker inside the contracting card for its 5 internal
  sub-stages.

## 3. Iteration 2 — card-level consistency pass

**Goal:** make every onboarding card feel like one system instead of 8
separately-styled forms.

- Added a `StatusBadge` component (`eligible` / `in_progress` /
  `pending_review` / `rejected` / `verified`) and standardized every card's
  header to use it, replacing ad hoc plain text and one-off badges.
- Added a `StepBadge` ("Step 3 of 8") to every card header, numbered from the
  same journey list driving the top tracker.

## 4. Feedback: "it feels like an exam"

The boss flagged that numbered steps and a literal countdown ("Step 3 of
8", numbered circles) reads like a test/checklist an agent has to pass under
pressure — not the tone wanted for something meant to support agents through
a stressful licensing process.

**Response — de-numbered everything:**

- Deleted the numbered circle tracker and the per-card `StepBadge` entirely.
- Replaced the top journey panel with a simple **progress bar** +
  encouraging caption (`resources/js/components/ui/journey-progress.tsx`):
  `"3 of 8 completed"` next to a message that scales with progress
  ("Let's get started!" → "Nice progress!" → "You're doing great!" →
  "Almost there!" → "All done — amazing work!"), plus a soft "Up next: …"
  line naming the next step by title, not number.
- Applied the same bar to the contracting card's internal sub-stages.

## 5. Follow-up ask: "revamp the UI"

Asked to go further, scoped to three things: visual tone, layout/flow (see
the whole path up front, not one card at a time), and overall design-system
consistency. This produced the current design:

- **`resources/js/lib/onboarding-icons.tsx`** — one distinct icon per stage
  (`ClipboardCheck`, `BookOpen`, `GraduationCap`, `PencilLine`,
  `Fingerprint`, `BadgeCheck`, `ShieldCheck`, `Handshake`), the single source
  of truth used everywhere a stage is represented.
- **`resources/js/components/ui/journey-path.tsx`** — replaces the plain
  progress bar at the top of the dashboard with an icon path: every stage
  shows its own icon; completed stages swap to a checkmark; the current
  stage gets a highlighted ring; all 8 stages are visible at once (no
  numbers, full path visible up front). Keeps the same progress caption and
  "Up next" line as iteration 2.
- **`resources/js/components/ui/stage-icon.tsx`** — the round icon badge
  used in every card's header, so each card visually matches its dot on the
  journey path above.
- Every onboarding card header now reads: `[stage icon] Title  [status badge]`
  — tying each card back into the overall journey without any digits.

## 6. Iteration 3 — journey trail + "whole path" list

A standalone prototype (`onboarding.tsx`, dropped at the repo root) explored
a further step: a winding SVG "trail" through the stages instead of a
straight icon row, plus a collapsed checklist below the active card so
agents can glance back at finished stages or peek at what's locked ahead —
all in the same brand palette already used in the sidebar (`#5A4177` ink,
`#F598FF` accent, `#ECE7F5` borders).

The prototype itself wasn't usable as-is — untyped props, a hardcoded hex
palette with no dark-mode variants, a runtime Google Fonts `@import`, and a
fully fake local state machine standing in for the real per-stage business
logic (file uploads, line-of-authority pickers, proctoring-type pickers,
etc. that the real cards already handle). It was ported properly instead of
copied:

- Brand colors became real CSS custom properties in `resources/css/app.css`
  (`--journey-ink`, `--journey-accent`, `--journey-border`, …) with light
  **and** dark variants, following the same pattern as the existing
  `--sidebar-*` tokens.
- `resources/js/components/ui/journey-trail.tsx` — typed, reduced-motion
  aware (via a new `useReducedMotion` hook) reimplementation of the winding
  trail, driven by the same `isDone` callback pattern as the earlier
  `JourneyPath`/`JourneyProgress`. No new fonts — inherits the app's
  existing font stack. Purely a visualization; it does not support jumping
  to arbitrary stages, since the real flow only ever exposes one active
  stage's card.
- `resources/js/components/ui/journey-trail-row.tsx` — the collapsed
  "whole path" list row, reusing the existing `StageIcon` and `StatusBadge`
  components rather than reinventing them. Only completed rows expand (to
  show a one-line summary); locked/upcoming rows show a lock icon and
  "Not yet," matching the "no faked interactivity" rule.
- `dashboard-agent.tsx` now renders `JourneyTrail` at the top (replacing the
  older `JourneyPath`) and a "Whole path" section below the active card
  stack, using `JourneyTrailRow` for every stage except the current one.
- Removed `resources/js/components/ui/journey-path.tsx` (superseded) and the
  prototype file `onboarding.tsx` from the repo root once ported.

## 6a. Reverted — back to a progress bar

The winding SVG trail turned out to be more than the top-of-page journey
overview needed: on the newly full-width layout it scaled up disproportionately
(fixed to a large fix before this decision — see the earlier viewBox-clipping
note), and ultimately a plain progress bar communicated "how far along am I"
more simply. Swapped `JourneyTrail` back out for `JourneyProgress` (the bar +
encouragement caption + "Up next" line from iteration 2) at the top of
`dashboard-agent.tsx`, capped at `max-w-3xl` so it doesn't stretch edge-to-edge
on the full-width layout. Removed `journey-trail.tsx` and the
`useReducedMotion` hook (only consumer) along with the `--journey-*` brand CSS
tokens, since nothing references them anymore.

The "whole path" collapsed row list (`JourneyTrailRow`) stayed — it's a
separate, still-useful feature (glance back at finished stages, peek at
locked ones) independent of which visualization sits at the top.

## 7. Files touched (current state)

**Added:**
- `resources/js/lib/onboarding-icons.tsx`
- `resources/js/components/ui/journey-trail-row.tsx` (the "whole path" list row)
- `resources/js/components/ui/journey-progress.tsx` (progress bar + caption)
- `resources/js/components/ui/stage-icon.tsx`
- `resources/js/components/ui/status-badge.tsx`

**Removed** (superseded, or reverted after iteration 6):
- `resources/js/components/ui/stepper.tsx` (numbered circle tracker)
- `resources/js/components/ui/step-badge.tsx` ("Step N of 8" pill)
- `resources/js/components/ui/journey-path.tsx` (first icon-row attempt)
- `resources/js/components/ui/journey-trail.tsx` (winding SVG trail — tried,
  then reverted back to the simpler progress bar; see §6a)
- `resources/js/hooks/use-reduced-motion.ts` (only used by the trail)
- `--journey-*` brand tokens in `resources/css/app.css` (only used by the trail)
- `onboarding.tsx` (repo-root prototype, ported into the above, then removed)

**Modified:**
- `resources/js/pages/dashboard-agent.tsx` — journey progress bar + "whole
  path" list + step-done logic
- `resources/js/components/how-to-enroll-card.tsx`
- `resources/js/components/complete-xcel-training-card.tsx`
- `resources/js/components/schedule-state-exam-card.tsx`
- `resources/js/components/fingerprinting-card.tsx`
- `resources/js/components/submit-license-application-card.tsx`
- `resources/js/components/submit-license-copy-card.tsx`
- `resources/js/components/ahip-certification-card.tsx`
- `resources/js/components/contracting-and-sales-training-card.tsx`

## 8. Design principles landed on

1. **No numbers, no countdowns.** Progress is communicated with icons,
   checkmarks, a fill bar, and encouraging copy — never "X of Y" framed as a
   score or a test.
2. **Show the whole path, not just the next hoop.** The "whole path" list
   lets an agent look back at finished stages or peek at what's locked
   ahead, even though only one action card — and a simple progress bar, not
   a full stage-by-stage diagram — is shown at the top.
3. **One shared vocabulary of icons and status colors** across every card
   and the "whole path" list, so nothing feels bolted on.
4. **Status badges describe state, not urgency** — `in_progress` /
   `pending_review` / `rejected` / `verified` — kept because they're
   informational, not scoreboard-like.
5. **No faked interactivity.** Visualizations reflect real backend state
   only; nothing lets an agent "jump ahead" or triggers a fake completion
   that isn't backed by an actual `router.post(...)` call.
6. **Simplest visualization that does the job.** A fancier visual (the SVG
   trail) was tried and reverted once a plain progress bar communicated the
   same "how far along am I" more directly — don't keep visual complexity
   around once a simpler version covers the need.

## 9. How to extend this later

- **Adding a new onboarding stage:** add an icon to `ONBOARDING_ICONS` in
  `onboarding-icons.tsx`, add an entry (key, title, icon, summary) to
  `JOURNEY_STEPS` in `dashboard-agent.tsx`, add the `isJourneyStepDone` case,
  and use `<StageIcon icon={ONBOARDING_ICONS.yourKey} />` in the new card's
  header.
- **Changing the encouragement copy:** edit `encouragementFor()` in
  `journey-progress.tsx`.
- **Reusing this pattern elsewhere:** `JourneyProgress` and
  `JourneyTrailRow` are generic (`steps`/`stage` + `isDone`/`done` props) and
  not specific to agent onboarding — they can back any other multi-stage
  flow in the app that wants the same friendly, non-numeric treatment.

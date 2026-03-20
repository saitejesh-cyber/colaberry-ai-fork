# ADR-003: Spec-Driven Development Workflow

**Status:** Accepted
**Date:** 2026-03-10
**Decision Makers:** Engineering Team

## Context

Ad-hoc "vibe coding" with Claude led to inconsistent results — features that didn't match requirements, rework cycles, and drift from architectural principles. The team needed a structured workflow that ensures clarity before code is written.

## Decision

Adopt a **4-phase Spec-Driven Development (SDD)** workflow for all non-trivial features:

1. **Specify** (`@spec-writer`) → `specs/{feature}/spec.md` — User stories, acceptance criteria, edge cases (WHAT + WHY)
2. **Plan** (`@spec-planner`) → `specs/{feature}/plan.md` — Architecture, file changes, testing strategy (HOW)
3. **Tasks** (`@spec-tasks`) → `specs/{feature}/tasks.md` — Numbered tasks, 1-3 files each, ordered by dependency
4. **Implement** — Execution agents (`@frontend-dev`, `@testing`, etc.) execute tasks one at a time
5. **Review** (`@spec-reviewer`) — Validates quality, completeness, Constitution compliance

### Guardrails
- `Constitution.md` is the immutable constraint layer — no spec can override it
- Templates in `specs/_templates/` ensure consistent document structure
- Each phase produces a reviewable artifact before proceeding

## Consequences

- **Positive:** Features are specified before coding. Rework is caught at the spec/plan phase (cheaper to fix). Constitution prevents architectural drift.
- **Negative:** More upfront time per feature. Overhead for truly trivial changes.
- **Mitigation:** SDD is only required for "non-trivial" features. Bug fixes, typo corrections, and single-file changes can skip the workflow.

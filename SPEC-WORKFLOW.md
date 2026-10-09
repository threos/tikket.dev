# Spec-driven development workflow

This workflow is opt-in. To use it, say "use spec-driven development" or "follow the spec workflow". A spec is a set of design documents for one feature.

## Design documents

The `specs/` folder holds the design documents for features in development. Each spec has this structure:

```
specs/{feature}/
├── CLAUDE.md           # Feature-specific instructions (read this first)
├── design.md           # The specification
├── implementation.md   # Current status and what's done
├── decisions.md        # Why decisions were made
├── prompts.md          # Reusable prompts
├── future-work.md      # What's deferred
└── docs/               # Documentation with screenshots
```

Workflow:

1. Read the `CLAUDE.md` of the spec. It holds the instructions for this feature.
2. Read `design.md`. It describes what we build.
3. Read `implementation.md` for the current status.
4. Find the relevant code in the codebase.
5. Implement the feature in small pieces. Update `implementation.md` after each piece.

## When you implement a feature in spec mode

1. Look for a design document in `specs/`. If one exists, follow it.
2. If no spec exists, ask whether you must create one first.
3. Find similar code in the codebase and follow its conventions.
4. Update `implementation.md` after each piece. Mark what is done.
5. Update `decisions.md` when you choose between approaches.

## Create a new spec

When the user asks for a new feature:

1. Copy the template: `cp -r specs/_templates specs/{feature-name}`
2. Explore the codebase to learn the existing patterns.
3. Write the technical specification in `design.md`.
4. Write the instructions for this feature in `CLAUDE.md`.
5. Set the status in `implementation.md` to "not-started".
6. Ask the user to review the spec before you implement it.

## Update the spec files

### implementation.md

Update this file after you complete each piece:

```markdown
## Status: in-progress

## Completed
- [x] Database schema
- [x] Migration file

## In Progress
- tRPC endpoints

## Next Steps
1. UI components
2. Tests

## Session Notes
### 2024-01-15
- Done: Added schema, created migration
- Next: Implement tRPC router
```

### decisions.md

Update this file when you choose between approaches:

```markdown
## ADR-001: Use Separate Table for Custom Locations

### Context
Need to store user-defined locations.

### Options
1. JSON field: simpler, but harder to query
2. Separate table: more flexible, better indexing

### Decision
Separate table for better querying.

### Consequences
- Need migration
- Need new tRPC router
```

## Rules for spec mode

- Do not implement a feature before you look for a design document.
- Do not skip the update of `implementation.md` after you complete work.
- Do not make an architectural decision without a record in `decisions.md`.

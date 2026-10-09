# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> `CLAUDE.md` is a symlink to `AGENTS.md`, and `.claude/rules`, `.claude/skills`, `.cursor/rules` and `.cursor/skills` are symlinks into `agents/`. Edit the files in `agents/` and `AGENTS.md`, not the symlinks.

# Tikket Development Guide for AI Agents

You are a senior engineer on **Tikket** (tikket.dev) working in a Yarn/Turbo monorepo. You prioritize type safety, security, and small, reviewable diffs.

## What Tikket is

Tikket is a fork of [Cal.diy](https://github.com/calcom/cal.diy), the MIT-licensed community edition of Cal.com. Cal.diy **removed** Cal.com's enterprise features (Teams, Organizations, Insights, Workflows, Routing Forms, SSO). Tikket's goal is to add **team scheduling features back** as MIT open source — team management and assignment, and routing strategies such as round-robin — and to offer an affordable hosted version.

Most docs, rules and package names still say "Cal.diy" / `@calcom/*`. That is expected. Do not mass-rename packages, imports or the `calendso` database; it breaks the build and makes upstream merges painful.

### State of team features in the fork (as inherited)

Cal.diy stripped the team **UI and tRPC/API surface** but kept most of the **data model and booking engine**. Before you build a team feature, check what already exists:

| Layer | Status | Where |
|-------|--------|-------|
| Schema | Kept: `Team`, `Membership` (`MembershipRole`), `Host` (`isFixed`, `priority`, `weight`, `groupId`), `HostGroup`, `HostLocation`, `EventType.schedulingType` (`ROUND_ROBIN` / `COLLECTIVE` / `MANAGED`), `Team.rrResetInterval` / `rrTimestampBasis`, `Attribute` | `packages/prisma/schema.prisma` |
| Round-robin selection | Kept: weights, priorities, fairness, host groups | `packages/features/bookings/lib/getLuckyUser.ts`, DI in `packages/features/di/modules/LuckyUser.ts` |
| Qualified hosts / host filtering | Kept | `packages/features/di/modules/QualifiedHosts.ts`, `FilterHosts.ts`, `packages/features/host/` |
| Team booking flow | Kept: `isTeamEventType`, fixed + RR users, lucky-user pools | `packages/features/bookings/lib/service/RegularBookingService.ts`, `handleNewBooking/loadAndValidateUsers.ts` |
| Team availability aggregation | Kept | `packages/features/availability/lib/getAggregatedAvailability/` |
| Assignment reason | Kept (repository only) | `packages/features/assignment-reason/` |
| Membership | Repositories/services only | `packages/features/membership/` |
| API v2 | Partial: `teams`, `teams/event-types`, `memberships`, `organizations` modules exist | `apps/api/v2/src/modules/` |
| tRPC | **Removed**: no `teams` router under `packages/trpc/server/routers/viewer/` | — |
| Web UI | **Removed**: no team settings pages, no `/team/[slug]` booking page (only `[user]` and `d/[link]` under `apps/web/app/(booking-page-wrapper)/`), no event-type assignment tab | `apps/web/modules/`, `apps/web/app/` |
| Routing Forms / Workflows (`packages/features/ee/`) | **Removed entirely** | — |

The seed script (`scripts/seed.ts`, run by `yarn dx` / `yarn db-seed`) still creates teams and `ROUND_ROBIN` event types, so you can test the booking engine locally.

### Guidance for Tikket work

- Reuse and extend the kept engine (`getLuckyUser`, qualified hosts, `Host`/`HostGroup`) instead of writing a new assignment algorithm. Add new routing strategies with the factory pattern ([patterns-factory-pattern](agents/rules/patterns-factory-pattern.md)), not as more `if (schedulingType === ...)` branches inside `RegularBookingService`.
- When you restore a feature that exists in upstream Cal.com, read the upstream implementation for reference, but write it to the rules in this file (repositories + DI services, DTOs, `select`). Do not copy code from Cal.com's `ee/` directories: it is under a commercial license, not MIT.
- Keep Tikket-specific code in new, clearly-named folders and files where you can, so that merging updates from upstream Cal.diy stays easy.
- Hosted-version concerns (billing, plan limits) must stay optional, so self-hosters can run the open-source edition without them.

## Do

- Use `select` instead of `include` in Prisma queries for performance and security
- Use `import type { X }` for TypeScript type imports
- Use early returns to reduce nesting: `if (!booking) return null;`
- Use `ErrorWithCode` for errors in non-tRPC files (services, repositories, utilities); use `TRPCError` only in tRPC routers
- Use conventional commits: `feat:`, `fix:`, `refactor:`
- Create PRs in draft mode by default
- Run `yarn type-check:ci --force` before concluding CI failures are unrelated to your changes
- Import directly from source files, not barrel files (e.g., `@calcom/ui/components/button` not `@calcom/ui`)
- Add translations to `packages/i18n/locales/en/common.json` for all UI strings
- Use `date-fns` or native `Date` instead of Day.js when timezone awareness isn't needed
- Put permission checks in `page.tsx`, never in `layout.tsx`
- Use `ast-grep` for searching if available; otherwise use `rg` (ripgrep), then fall back to `grep`
- Use Biome for formatting and linting
- Only add code comments that explain **why**, not **what** — see [code comment guidelines](agents/rules/quality-code-comments.md)


## Don't

- Never use `as any` - use proper type-safe solutions instead
- Never expose `credential.key` field in API responses or queries
- Never commit secrets or API keys
- Never modify `*.generated.ts` files directly - they're created by app-store-cli
- Never put business logic in repositories - that belongs in Services
- Never use barrel imports from index.ts files
- Never skip running type checks before pushing
- Never create large PRs (>500 lines or >10 files) - split them instead
- Never add comments that simply restate what the code does (e.g., `// Get the user` above a `getUser()` call)

## PR Size Guidelines

Large PRs are difficult to review, prone to errors, and slow down the development process. Always aim for smaller, self-contained PRs that are easier to understand and review.

### Size Limits

- **Lines changed**: Keep PRs under 500 lines of code (additions + deletions)
- **Files changed**: Keep PRs under 10 code files
- **Single responsibility**: Each PR should do one thing well

**Note**: These limits apply to code files only. Non-code files like documentation (README.md, CHANGELOG.md), lock files (yarn.lock, package-lock.json), and auto-generated files are excluded from the count.

### How to Split Large Changes

When a task requires extensive changes, break it into multiple PRs:

1. **By layer**: Separate database/schema changes, backend logic, and frontend UI into different PRs
2. **By feature component**: Split a feature into its constituent parts (e.g., API endpoint PR, then UI PR, then integration PR)
3. **By refactor vs feature**: Do preparatory refactoring in a separate PR before adding new functionality
4. **By dependency order**: Create PRs in the order they can be merged (base infrastructure first, then features that depend on it)

### Examples of Good PR Splits

**Instead of one large "Add booking notifications" PR:**
- PR 1: Add notification preferences schema and migration
- PR 2: Add notification service and API endpoints
- PR 3: Add notification UI components
- PR 4: Integrate notifications into booking flow

**Instead of one large "Refactor calendar sync" PR:**
- PR 1: Extract calendar sync logic into dedicated service
- PR 2: Add new calendar provider abstraction
- PR 3: Migrate existing providers to new abstraction
- PR 4: Add new calendar provider support

### Benefits of Smaller PRs

- Faster review cycles and quicker feedback
- Easier to identify and fix issues
- Lower risk of merge conflicts
- Simpler to revert if problems arise
- Better git history and easier debugging

## Commands

See [agents/commands.md](agents/commands.md) for full reference. Key commands:

```bash
yarn type-check:ci --force  # Type check (always run before pushing)
yarn biome check --write .  # Lint and format
TZ=UTC yarn test            # Run unit tests
yarn prisma generate        # Regenerate types after schema changes
yarn dx                     # Start Postgres in Docker, migrate, seed, run web app
yarn dev                    # Run web app only (needs DB already set up)
TZ=UTC yarn vitest run packages/features/bookings/lib/getLuckyUser.test.ts      # Single test file
TZ=UTC yarn vitest run <file> -t "<test name>"                                  # Single test
```


## Boundaries

### Always do
- Run type check on changed files before committing
- Run relevant tests before pushing
- Use `select` in Prisma queries
- Follow conventional commits for PR titles
- Run Biome before pushing

### Ask first
- Adding new dependencies
- Schema changes to `packages/prisma/schema.prisma`
- Changes affecting multiple packages
- Deleting files
- Running full build or E2E suites

### Never do
- Commit secrets, API keys, or `.env` files
- Expose `credential.key` in any query
- Use `as any` type casting
- Force push or rebase shared branches
- Modify generated files directly

## Project Structure

```
apps/web/                    # Main Next.js application
packages/prisma/             # Database schema (schema.prisma) and migrations
packages/trpc/               # tRPC API layer (routers in server/routers/)
packages/ui/                 # Shared UI components
packages/features/           # Feature-specific code
packages/app-store/          # Third-party integrations
packages/lib/                # Shared utilities
```

### Key files
- Routes: `apps/web/app/` (App Router)
- Database schema: `packages/prisma/schema.prisma`
- tRPC routers: `packages/trpc/server/routers/`
- Translations: `packages/i18n/locales/en/common.json`
- Round-robin / host selection: `packages/features/bookings/lib/getLuckyUser.ts`
- Booking service (team + individual): `packages/features/bookings/lib/service/RegularBookingService.ts`
- DI modules and containers: `packages/features/di/modules/`, `packages/features/di/containers/`

## Tech Stack

- **Framework**: Next.js 13+ (App Router in some areas)
- **Language**: TypeScript (strict)
- **Database**: PostgreSQL with Prisma ORM
- **API**: tRPC for type-safe APIs
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS
- **Testing**: Vitest (unit), Playwright (E2E)
- **i18n**: next-i18next

## Code Examples

### Good error handling

```typescript
// Good - Descriptive error with context
throw new Error(`Unable to create booking: User ${userId} has no available time slots for ${date}`);

// Bad - Generic error
throw new Error("Booking failed");
```

For which error class to use (`ErrorWithCode` vs `TRPCError`) and concrete examples, see [quality-error-handling](agents/rules/quality-error-handling.md).

### Good Prisma query

```typescript
// Good - Use select for performance and security
const booking = await prisma.booking.findFirst({
  select: {
    id: true,
    title: true,
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      }
    }
  }
});

// Bad - Include fetches all fields including sensitive ones
const booking = await prisma.booking.findFirst({
  include: { user: true }
});
```

### Good imports

```typescript
// Good - Type imports and direct paths
import type { User } from "@prisma/client";
import { Button } from "@calcom/ui/components/button";

// Bad - Regular import for types, barrel imports
import { User } from "@prisma/client";
import { Button } from "@calcom/ui";
```

### API v2 Imports (apps/api/v2)

When importing from `@calcom/features` or `@calcom/trpc` into `apps/api/v2`, **do not import directly** because the API v2 app's `tsconfig.json` doesn't have path mappings for these modules, which causes "module not found" errors.

Instead, re-export from `packages/platform/libraries/index.ts` and import from `@calcom/platform-libraries`:

```typescript
// Step 1: In packages/platform/libraries/index.ts, add the export
export { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";

// Step 2: In apps/api/v2, import from platform-libraries
import { ProfileRepository } from "@calcom/platform-libraries";

// Bad - Direct import causes module not found error in apps/api/v2
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
```

## PR Checklist

- [ ] Title follows conventional commits: `feat(scope): description`
- [ ] Type check passes: `yarn type-check:ci --force`
- [ ] Lint passes: `yarn lint:fix`
- [ ] Relevant tests pass
- [ ] Diff is small and focused (<500 lines, <10 files)
- [ ] No secrets or API keys committed
- [ ] UI strings added to translation files
- [ ] Created as draft PR

## When Stuck

- Ask a clarifying question before making large speculative changes
- Propose a short plan for complex tasks
- Open a draft PR with notes if unsure about approach
- Fix type errors before test failures - they're often the root cause
- Run `yarn prisma generate` if you see missing enum/type errors

## Spec-Driven Development (Opt-In)

For complex features, you can use spec-driven development when explicitly requested.

**To enable:** Tell the AI "use spec-driven development" or "follow the spec workflow"

See [SPEC-WORKFLOW.md](SPEC-WORKFLOW.md) for the full workflow documentation.

## Extended Documentation

For detailed information, see the `agents/` directory:

- **[agents/README.md](agents/README.md)** - Rules index and architecture overview
- **[agents/rules/](agents/rules/)** - Modular engineering rules
- **[agents/commands.md](agents/commands.md)** - Complete command reference
- **[agents/knowledge-base.md](agents/knowledge-base.md)** - Domain knowledge and business rules

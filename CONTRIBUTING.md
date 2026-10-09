# Contributing to Tikket

Tikket is open-source scheduling for teams, licensed under MIT. It is a fork of Cal.diy, the MIT community edition of Cal.com. Tikket adds team scheduling back under MIT: team management and assignment, round-robin with weights and priorities, and collective events. A contribution that you make here goes into Tikket. It does not go into Cal.diy or into Cal.com.

Thank you for your interest in Tikket. This guide explains how to contribute.

## House rules for pull requests and issues

### Prevent duplicate work

Before you open an issue or a pull request, search the open [issues](https://github.com/threos/tikket.dev/issues) and [pull requests](https://github.com/threos/tikket.dev/pulls). If the same item exists, add your information there.

### Work only on approved issues

A feature request must go through review and approval. This keeps the product direction consistent. For a feature request, wait until a core team member approves it and removes the `🚨 needs approval` label. Then start the code or the pull request.

For a bug, a security problem, a performance problem, or documentation, you can start at once, even if the label is present.

### Do not post a link without context

Do not post a third-party link, for example a Slack thread or a Linear ticket, without context. A GitHub issue or pull request must stand on its own. A reviewer must not have to search other tools to understand it.

### Think like a reviewer

Put yourself in the place of the reviewer. What do you want to know when you read this for the first time? Name the key decisions, goals, and constraints. Do not assume knowledge that is not obvious. Link related issues and earlier pull requests.

### Bring in context from private channels

If the task started in Slack or another private channel, copy the relevant details into the issue or pull request. Do not share sensitive information, but make sure that the important reasoning is there.

> Example:
> "A user requested feature X to solve problem Y. I considered approaches A, B, and C. I chose C for these reasons: ..."

### Treat it like documentation

GitHub is the shared source of truth. Each issue and pull request adds to the long-term understanding of the code. Write clearly enough that a reader, possibly you, can return months later and still understand what happened and why.

### Summarize your pull request at the top

Add a short written summary, even if the code change is small or obvious. The summary helps the reviewer understand the intent fast. You can use the auto-summarize feature of GitHub Copilot, but make sure that the result is accurate and relevant.

### Use GitHub keywords to link issues

Write "Closes #123" or "Fixes #456" in the description of the pull request. GitHub then links the pull request to the issue and closes the issue when the pull request merges.

### Say what you tested and how

Explain how you tested your change. A short note is enough. The reviewer must be able to see that the change works as expected.

> Example:
> "Tested locally with mock data. Made sure that the flow works on staging."

### Assume that future you will not remember

Write for the future. If there are trade-offs, edge cases, or temporary workarounds, document them so that they are not lost or misread later.

## Priorities

<table>
  <tr>
    <td><strong>Type of issue</strong></td>
    <td><strong>Priority</strong></td>
  </tr>
  <tr>
    <td>Minor improvements, non-core feature requests</td>
    <td>
      <a href="https://github.com/threos/tikket.dev/issues?q=is:issue+is:open+sort:updated-desc+label:%22Low+priority%22">
        <img src="https://img.shields.io/badge/-Low%20Priority-green">
      </a>
    </td>
  </tr>
  <tr>
    <td>Confusing UX (but still functional)</td>
    <td>
      <a href="https://github.com/threos/tikket.dev/issues?q=is:issue+is:open+sort:updated-desc+label:%22Medium+priority%22">
        <img src="https://img.shields.io/badge/-Medium%20Priority-yellow">
      </a>
    </td>
  </tr>
  <tr>
    <td>Core features (booking page, availability, timezone calculation)</td>
    <td>
      <a href="https://github.com/threos/tikket.dev/issues?q=is:issue+is:open+sort:updated-desc+label:%22High+priority%22">
        <img src="https://img.shields.io/badge/-High%20Priority-orange">
      </a>
    </td>
  </tr>
  <tr>
    <td>Core bugs (login, booking page, emails not working)</td>
    <td>
      <a href="https://github.com/threos/tikket.dev/issues?q=is:issue+is:open+sort:updated-desc+label:Urgent">
        <img src="https://img.shields.io/badge/-Urgent-red">
      </a>
    </td>
  </tr>
</table>

## File naming conventions

We use these naming conventions for services, repositories, and other class-based files. They keep names consistent and make files easy to find with fuzzy search.

### Repository files

- A repository class file must have the `Repository` suffix.
- If a specific technology backs the repository, for example Prisma, start the file name and the class name with it.
- The file name must match the exported class exactly, in PascalCase.

Pattern:

`Prisma<Entity>Repository.ts`

Examples:

```ts
// File: PrismaAppRepository.ts
export class PrismaAppRepository { ... }

// File: PrismaMembershipRepository.ts
export class PrismaMembershipRepository { ... }
```

This prevents ambiguous file names like `app.ts` and makes files easier to find in an editor.

### Service files

- A service class file must have the `Service` suffix.
- The file name must be in PascalCase and must match the exported class.
- Keep the name specific. Do not use a generic name like `AppService.ts`.

Pattern:

`<Entity>Service.ts`

Examples:

```ts
// File: MembershipService.ts
export class MembershipService { ... }

// File: HashedLinkService.ts
export class HashedLinkService { ... }
```

A new file must not use a dot suffix like `.service.ts` or `.repository.ts`. We will migrate the existing files step by step. We keep the suffixes `.test.ts`, `.spec.ts`, and `.types.ts` for their own purposes.

## Development

See the [Development section of the README](./README.md#development).

## Build

Build the project with:

```bash
yarn build
```

Make sure that you can make a full production build before you push code.

## Tests

### Unit tests

Run the unit tests with:

```bash
TZ=UTC yarn test
```

The `TZ=UTC` variable keeps date handling the same on every machine. To run one test file, use `TZ=UTC yarn vitest run <file>`.

### End-to-end tests

See the [E2E testing section of the README](./README.md#e2e-testing).

#### Test browsers not installed

If `yarn test-e2e` stops with the error below, run `npx playwright install`. The command downloads the test browsers.

```
Executable doesn't exist at /Users/alice/Library/Caches/ms-playwright/chromium-1048/chrome-mac/Chromium.app/Contents/MacOS/Chromium
```

## Lint, format, and type check

Lint and format the code with Biome:

```sh
yarn biome check --write .
```

Run the type check:

```sh
yarn type-check:ci --force
```

If a command reports errors, fix them before you commit.

## Making a pull request

### Keep pull requests small and focused

A large pull request is hard to review and more likely to contain errors. Keep each pull request small and self-contained:

- Keep a pull request under 500 lines of code changed and under 10 code files changed. Documentation, lock files, and generated files do not count.
- Give each pull request one responsibility: one feature, one bug fix, or one refactor.
- If your task needs more changes, split it into several pull requests. A reviewer can then review and merge them one at a time.

How to split a large change:

- Put database and schema changes in a separate pull request from application logic.
- Split frontend and backend changes when possible.
- Do preparatory refactoring in a separate pull request before you add a feature.
- Open the pull requests in dependency order: infrastructure first, then features.

### Pull request checklist

- Select the ["Allow edits from maintainers" option](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/allowing-changes-to-a-pull-request-branch-created-from-a-fork) when you create the pull request. This option is not available if you [contribute from a fork that belongs to an organization](https://github.com/orgs/community/discussions/5634).
- If your pull request refers to or fixes an issue, add `refs #XXX` or `fixes #XXX` to the description. Replace `XXX` with the issue number. See [linking a pull request to an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue).
- Fill out the pull request template.
- If you build an integration, read the [App Contribution Guidelines](./packages/app-store/CONTRIBUTING.md).
- Keep your branch up to date, for example with the `Update branch` button on the GitHub pull request page.

<!-- PROJECT LOGO -->
<p align="center">
  <a href="https://github.com/threos/tikket.dev">
   <picture>
     <source media="(prefers-color-scheme: dark)" srcset="docs/brand/tikket-lockup-white.svg">
     <img src="docs/brand/tikket-lockup.svg" alt="Tikket" height="52">
   </picture>
  </a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/readme-banner-dark.svg">
    <img src="docs/brand/readme-banner.svg" alt="Tikket: scheduling for teams" width="100%">
  </picture>
</p>

<p align="center">
  Scheduling for teams.
  <br />
  Round-robin, weighted routing and collective events. Open source.
  <br />
  <a href="https://tikket.dev">Website</a>
  &middot;
  <a href="./apps/docs">Docs</a>
  &middot;
  <a href="https://github.com/threos/tikket.dev/issues">Issues</a>
  &middot;
  <a href="./CONTRIBUTING.md">Contributing</a>
</p>

<p align="center">
   <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-purple" alt="MIT license"></a>
   <a href="https://github.com/threos/tikket.dev/stargazers"><img src="https://img.shields.io/github/stars/threos/tikket.dev" alt="GitHub stars"></a>
   <a href="https://github.com/threos/tikket.dev/pulse"><img src="https://img.shields.io/github/commit-activity/m/threos/tikket.dev" alt="Commits per month"></a>
</p>

## What Tikket is

Tikket is open-source scheduling for teams, licensed under MIT. It is a fork of Cal.diy, the MIT community edition of Cal.com without the enterprise features (teams, organizations, insights, workflows, routing forms, SSO). Tikket adds team scheduling back under MIT: teams, roles and invites, shared team event types, round-robin with weights and priorities, and collective events. A hosted version runs at [tikket.dev](https://tikket.dev). You can run the open-source edition on your own server without the hosted features (billing, plan limits).

Built with:

- [Next.js](https://nextjs.org/)
- [tRPC](https://trpc.io/)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://prisma.io/)
- [Daily.co](https://daily.co/)

## Quick start

You need these tools:

- Node.js 18 or newer
- PostgreSQL 13 or newer
- Yarn 4
- Docker and Docker Compose (for `yarn dx`)

If your Node.js version is too old, nvm (Node Version Manager) can switch to the correct version. Run `nvm use` in the project folder. If that version is not installed, run `nvm install && nvm use`. You can install nvm from [github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm).

If you want to use an integration, you need credentials for it. See [Integrations](#integrations).

1. Clone the repository, go to the project folder and install the packages.

   ```sh
   git clone https://github.com/threos/tikket.dev.git
   cd tikket.dev
   yarn
   ```

   If you are on Windows, clone with this command instead, in Git Bash with admin privileges:
   `git clone -c core.symlinks=true https://github.com/threos/tikket.dev.git`

2. Create the `.env` file with `cp .env.example .env`. Then generate two keys and add them to `.env`:

   - Run `openssl rand -base64 32` and put the result in `NEXTAUTH_SECRET`.
   - Run `openssl rand -base64 24` and put the result in `CALENDSO_ENCRYPTION_KEY`.

   If you are on Windows, replace the `packages/prisma/.env` symlink with a real copy. In Git Bash or WSL, run `rm packages/prisma/.env && cp .env packages/prisma/.env`. This prevents the Prisma error `unexpected character / in variable name`.

3. Start the development stack.

   ```sh
   yarn dx
   ```

   This command starts Postgres in Docker, applies the migrations, seeds test users and starts the web app. The console shows the credentials of the test users.

| Email | Password | Role |
|-------|----------|------|
| `free@example.com` | `free` | Free user |
| `pro@example.com` | `pro` | Pro user |
| `trial@example.com` | `trial` | Trial user |
| `admin@example.com` | `ADMINadmin2022!` | Admin user |
| `onboarding@example.com` | `onboarding` | Onboarding incomplete |

Sign in with one of these users at [http://localhost:3000](http://localhost:3000). To see all seeded users, run `yarn db-studio` and open [http://localhost:5555](http://localhost:5555).

## Manual setup

Use this path when you have your own PostgreSQL server and do not use `yarn dx`. Do steps 1 and 2 of [Quick start](#quick-start) first.

1. In `.env`, set `DATABASE_URL`. Replace `<user>`, `<pass>`, `<db-host>` and `<db-port>` with your values.

   ```
   DATABASE_URL='postgresql://<user>:<pass>@<db-host>:<db-port>'
   ```

   If you do not have a database yet, create a local one:

   1. [Download](https://www.postgresql.org/download/) and install PostgreSQL.
   2. Create a database with `createdb <DB name>`.
   3. Open the psql shell for this database: `psql -h localhost -U postgres -d <DB name>`.
   4. In the psql shell, run `\conninfo`. The output names the database, the user, the host and the port.
   5. Put these values in `DATABASE_URL`, for example `postgresql://postgres:postgres@localhost:5432/Your-DB-Name`. The port does not have to be 5432.

   You can also use a hosted PostgreSQL database from [railway.app](https://docs.railway.app/guides/postgresql), [Northflank](https://northflank.com/guides/deploy-postgres-database-on-northflank) or [Render](https://render.com/docs/databases).

2. Copy `DATABASE_URL` from `.env` to `.env.appStore`.

3. Apply the Prisma schema (`packages/prisma/schema.prisma`) to the database. In development, run `yarn workspace @calcom/prisma db-migrate`. In production, run `yarn workspace @calcom/prisma db-deploy`.

   On Windows with PowerShell, this step can fail with `Environment variable not found: DATABASE_DIRECT_URL`. Turbo then did not inject the root `.env` variables. Run the commands from the prisma package folder instead:

   ```powershell
   cd packages/prisma
   $env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"; $env:DATABASE_DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"
   npx prisma db push
   cd ../..
   ```

4. Run [mailhog](https://github.com/mailhog/MailHog) to read the emails that the app sends in development. Mailhog is required when `E2E_TEST_MAILHOG_ENABLED` is "1".

   ```sh
   docker pull mailhog/mailhog
   docker run -d -p 8025:8025 -p 1025:1025 mailhog/mailhog
   ```

5. Start the web app in development mode with `yarn dev`.

### First user

You can create the first user by hand, or you can seed test users.

To create the user by hand:

1. Open [Prisma Studio](https://prisma.io/studio) to view and edit the database content: `yarn db-studio`.
2. Click the `User` model and add a new record.
3. Fill in `email`, `username` and `password`. Encrypt the password with [BCrypt](https://bcrypt-generator.com/) first. Set `metadata` to `{}`. Then click `Save 1 Record`. New users get the `TRIAL` plan by default. You can change this in `packages/prisma/schema.prisma`.
4. Open [http://localhost:3000](http://localhost:3000) and sign in with this user.

To seed test users instead, run `yarn db-seed` in the `packages/prisma` folder.

## Development

### Logger level

Add `NEXT_PUBLIC_LOGGER_LEVEL={level}` to `.env` to control how much the app logs for tRPC queries and mutations. The levels are `0` silly, `1` trace, `2` debug, `3` info, `4` warn, `5` error and `6` fatal.

The logger writes all logs at the given level and higher. With `NEXT_PUBLIC_LOGGER_LEVEL=2`, it writes debug, info, warn, error and fatal. With `NEXT_PUBLIC_LOGGER_LEVEL=3`, it writes info, warn, error and fatal, and it skips debug and trace. For example, `echo 'NEXT_PUBLIC_LOGGER_LEVEL=3' >> .env` sets the level to info.

### Memory limit for Node.js

If the Node.js process runs out of memory, add `export NODE_OPTIONS="--max-old-space-size=16384"` to your shell profile. You can also run this line in the terminal before you start the app. Replace 16384 with the amount of RAM, in megabytes, that you want to give the process.

### E2E-Testing

Make sure that `NEXTAUTH_URL` has the correct value. For a local run, `.env.example` gives `http://localhost:3000`.

```sh
# Run the end-to-end tests:
yarn test-e2e

# Open the last HTML report:
yarn playwright show-report test-results/reports/playwright-html-report
```

If `yarn test-e2e` stops with the error below, the test browsers are not installed. Run `npx playwright install` to download them.

```
Executable doesn't exist at /Users/alice/Library/Caches/ms-playwright/chromium-1048/chrome-mac/Chromium.app/Contents/MacOS/Chromium
```

### Upgrading

1. Pull the current version with `git pull`.
2. Install added, updated or removed dependencies with `yarn`.
3. Apply the database migrations with one of these commands. In development, run `yarn workspace @calcom/prisma db-migrate`. This command can clear your development database in some cases. In production, run `yarn workspace @calcom/prisma db-deploy`.
4. Run `yarn predev` to make sure that your `.env` file has all variables that the new version needs.
5. Start the server. In development, run `yarn dev`. For a production build, run `yarn build`, then `yarn start`.

## Deployment

Tikket runs on any host with Node.js and PostgreSQL. Build with `yarn build` and start with `yarn start`. The sections below cover Docker and Vercel.

### Docker

No Tikket image is published. You build the image from this repository. The `docker-compose.yml` file still references the upstream Cal.diy image, so build the image before you start the stack. You need `docker` and `docker compose` on the server. Docker Desktop and Rancher Desktop install both. Use `docker compose` without the hyphen. Docker names it as the primary command.

1. Clone the repository and go to the project folder (see [Quick start](#quick-start)).

2. Create `.env` with `cp .env.example .env` and update it. See [Run-time variables](#run-time-variables) and [Build-time variables](#build-time-variables) below.

   Generate values for `NEXTAUTH_SECRET` (cookie encryption key) and `CALENDSO_ENCRYPTION_KEY` (32 bytes for AES256). Do not keep the default `secret` placeholder in production. It is a security risk.

   ```bash
   openssl rand -base64 32   # NEXTAUTH_SECRET
   openssl rand -base64 24   # CALENDSO_ENCRYPTION_KEY
   ```

   Put the results in `.env` as `NEXTAUTH_SECRET=<your_generated_secret>` and `CALENDSO_ENCRYPTION_KEY=<your_generated_key>`.

   If the app stops with `Error: No key set vapidDetails.publicKey`, the Web Push variables are missing. Generate them with `npx web-push generate-vapid-keys`. Put them in `.env` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Do not commit real keys to `.env.example`. Only placeholders belong there.

3. Give the build a database. The build needs a reachable database because of the application configuration. If the database runs elsewhere, set `DATABASE_URL` in `.env` and go to step 4. If you need a local or temporary database, start one with `docker compose up -d database`.

4. Build the image. `DOCKER_BUILDKIT=0` lets the build use a network bridge. This requirement will go away in a later version.

   ```bash
   DOCKER_BUILDKIT=0 docker compose build calcom
   ```

5. Start the stack with one of these commands. For the last two, make sure that `DATABASE_URL` points to the remote database. To run in attached mode for debugging, remove `-d`.

   ```bash
   docker compose up -d                  # complete stack: local Postgres, Tikket web app, Prisma Studio
   docker compose up -d calcom studio    # web app and Prisma Studio, remote database
   docker compose up -d calcom           # web app only, remote database
   ```

6. Open [http://localhost:3000](http://localhost:3000), or the `NEXT_PUBLIC_WEBAPP_URL` that you set. On the first run, a setup wizard starts. Create your first user there. The wizard shows a "Connect your Calendar" step that looks required. To skip it, go to `<NEXT_PUBLIC_WEBAPP_URL>/event-types`. You can add a calendar later on the Settings > Integrations page.

To update a Docker installation, do these steps:

1. Stop the stack with `docker compose down`.
2. Pull the current source with `git pull`.
3. Build the image again (step 4).
4. If the new version needs new variables, add them to `.env`.
5. Start the stack again (step 5).

#### Run-time variables

The container needs these variables at run time.

| Variable | Description | Required | Default |
| --- | --- | --- | --- |
| DATABASE_URL | Database URL with credentials. If you use a connection pooler, point this variable at the pooler. | required | `postgresql://unicorn_user:magical_password@database:5432/calendso` |
| NEXT_PUBLIC_WEBAPP_URL | Base URL of the site. If this value differs from the build-time value, the container start takes longer, because it updates the static files. | optional | `http://localhost:3000` |
| NEXTAUTH_URL | Location of the auth server. By default, this is the Tikket container itself. | optional | `{NEXT_PUBLIC_WEBAPP_URL}/api/auth` |
| NEXTAUTH_SECRET | Cookie encryption key. Must match the build variable. Generate with `openssl rand -base64 32`. | required | `secret` |
| CALENDSO_ENCRYPTION_KEY | Authentication encryption key (32 bytes for AES256). Must match the build variable. Generate with `openssl rand -base64 24`. | required | `secret` |

#### Build-time variables

The build needs these variables. Set them in `.env` before you build. If you change one of them later, you must build the image again.

| Variable | Description | Required | Default |
| --- | --- | --- | --- |
| DATABASE_URL | Database URL with credentials. If you use a connection pooler, point this variable at the pooler. | required | `postgresql://unicorn_user:magical_password@database:5432/calendso` |
| MAX_OLD_SPACE_SIZE | Memory limit for the Node.js build | required | 4096 |
| NEXTAUTH_SECRET | Cookie encryption key | required | `secret` |
| CALENDSO_ENCRYPTION_KEY | Authentication encryption key | required | `secret` |
| NEXT_PUBLIC_WEBAPP_URL | Base URL written into the static files | optional | `http://localhost:3000` |
| NEXT_PUBLIC_WEBSITE_TERMS_URL | Custom URL of the terms and conditions page | optional | |
| NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL | Custom URL of the privacy policy page | optional | |
| CALCOM_TELEMETRY_DISABLED | Anonymous usage data collection. Set to `1` to disable it. | optional | |

#### Troubleshooting

SSL edge termination. If a load balancer in front of Tikket handles the SSL certificates, set `NODE_TLS_REJECT_UNAUTHORIZED=0`. Without it, the app rejects the requests. Only do this when you trust the services and load balancers that send traffic to Tikket.

Failed to commit changes: Invalid 'prisma.user.create()'. Some versions cannot create a user when the `metadata` field is empty. Set the field to the empty JSON object `{}`. The `id` field increments by itself, so you can also leave `id` empty.

CLIENT_FETCH_ERROR. The default auth callback on the server uses the `WEBAPP_URL` as its base URL. The container does not always have the same DNS as your local machine, so it must resolve to itself. Set `NEXTAUTH_URL=http://localhost:3000/api/auth` so that the backend loops back to itself. The error looks like this:

```
docker-calcom-1  | @calcom/web:start: [next-auth][error][CLIENT_FETCH_ERROR]
docker-calcom-1  | @calcom/web:start: https://next-auth.js.org/errors#client_fetch_error request to http://testing.localhost:3000/api/auth/session failed, reason: getaddrinfo ENOTFOUND testing.localhost {
docker-calcom-1  | @calcom/web:start:   error: {
docker-calcom-1  | @calcom/web:start:     message: 'request to http://testing.localhost:3000/api/auth/session failed, reason: getaddrinfo ENOTFOUND testing.localhost',
docker-calcom-1  | @calcom/web:start:     stack: 'FetchError: request to http://testing.localhost:3000/api/auth/session failed, reason: getaddrinfo ENOTFOUND testing.localhost\n' +
docker-calcom-1  | @calcom/web:start:       '    at ClientRequest.<anonymous> (/calcom/node_modules/next/dist/compiled/node-fetch/index.js:1:65756)\n' +
docker-calcom-1  | @calcom/web:start:       '    at ClientRequest.emit (node:events:513:28)\n' +
docker-calcom-1  | @calcom/web:start:       '    at ClientRequest.emit (node:domain:489:12)\n' +
docker-calcom-1  | @calcom/web:start:       '    at Socket.socketErrorListener (node:_http_client:494:9)\n' +
docker-calcom-1  | @calcom/web:start:       '    at Socket.emit (node:events:513:28)\n' +
docker-calcom-1  | @calcom/web:start:       '    at Socket.emit (node:domain:489:12)\n' +
docker-calcom-1  | @calcom/web:start:       '    at emitErrorNT (node:internal/streams/destroy:157:8)\n' +
docker-calcom-1  | @calcom/web:start:       '    at emitErrorCloseNT (node:internal/streams/destroy:122:3)\n' +
docker-calcom-1  | @calcom/web:start:       '    at processTicksAndRejections (node:internal/process/task_queues:83:21)',
docker-calcom-1  | @calcom/web:start:     name: 'FetchError'
docker-calcom-1  | @calcom/web:start:   },
docker-calcom-1  | @calcom/web:start:   url: 'http://testing.localhost:3000/api/auth/session',
docker-calcom-1  | @calcom/web:start:   message: 'request to http://testing.localhost:3000/api/auth/session failed, reason: getaddrinfo ENOTFOUND testing.localhost'
docker-calcom-1  | @calcom/web:start: }
```

### Vercel

A Vercel Pro plan is required, because the free plan limits the number of serverless functions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fthreos%2Ftikket.dev&env=DATABASE_URL,NEXT_PUBLIC_WEBAPP_URL,NEXTAUTH_URL,NEXTAUTH_SECRET,CRON_API_KEY,CALENDSO_ENCRYPTION_KEY&envDescription=See%20all%20available%20env%20vars&envLink=https%3A%2F%2Fgithub.com%2Fthreos%2Ftikket.dev%2Fblob%2Fmain%2F.env.example&project-name=tikket.dev&repo-name=tikket.dev&build-command=cd%20../..%20%26%26%20yarn%20build&root-directory=apps%2Fweb%2F)

## Integrations

In each section, replace `<Tikket URL>` with the URL where your Tikket instance runs.

### Google Calendar

1. Open the [Google API Console](https://console.cloud.google.com/apis/dashboard). If your Google Cloud subscription has no project, create one first. On the Dashboard pane, select Enable APIS and Services.
2. Type "calendar" in the search box and select the Google Calendar API result.
3. Enable the selected API.
4. Open the [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) from the side pane. Select the app type (Internal or External) and enter the basic app details on the first page.
5. On the second page (Scopes), select Add or Remove Scopes. Search for "Calendar.event", select the scopes `.../auth/calendar.events` and `.../auth/calendar.readonly`, and select Update.
6. On the third page (Test Users), add the Google accounts that you will use. Make sure that the details on the last page of the wizard are correct. The consent screen is then configured.
7. Select [Credentials](https://console.cloud.google.com/apis/credentials) from the side pane, select Create Credentials, then select OAuth Client ID.
8. Select Web Application as the Application Type.
9. Under Authorized redirect URIs, select Add URI and add `<Tikket URL>/api/integrations/googlecalendar/callback` and `<Tikket URL>/api/auth/callback/google`.
10. Google creates the key and returns you to the Credentials page. Select the new client ID under OAuth 2.0 Client IDs.
11. Select Download JSON. Paste the whole JSON string into `.env` as the value of `GOOGLE_API_CREDENTIALS`.

To add the Google Calendar app to the App Store, run `yarn seed-app-store` in the `packages/prisma` folder. This fills the App Store again. Then do these two steps to activate the app:

1. Add the extra redirect URL `<Tikket URL>/api/auth/callback/google`.
2. Under OAuth consent screen, click "PUBLISH APP".

### Microsoft Graph (Outlook Calendar)

1. Open [Azure App Registration](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps) and select New registration.
2. Name your application.
3. Set "Who can use this application or access this API?" to "Accounts in any organizational directory (Any Azure AD directory - Multitenant)".
4. Set the Web redirect URI to `<Tikket URL>/api/integrations/office365calendar/callback`.
5. Put the Application (client) ID in `.env` as `MS_GRAPH_CLIENT_ID`.
6. Click Certificates & secrets, create a new client secret, and put its value in `.env` as `MS_GRAPH_CLIENT_SECRET`.

### Zoom

1. Open the [Zoom Marketplace](https://marketplace.zoom.us/) and sign in with your Zoom account.
2. On the upper right, click "Develop", then "Build App".
3. Select "General App" and click "Create".
4. Name your app.
5. Under "Select how the app is managed", select "User-managed app".
6. If Zoom asks, deselect the option to publish the app on the Zoom App Marketplace.
7. Copy the Client ID and the Client Secret into `.env` as `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET`.
8. Under "OAuth Information", set the "OAuth Redirect URL" to `<Tikket URL>/api/integrations/zoomvideo/callback`.
9. Add the same redirect URL to the allow list and enable "Subdomain check". Make sure that the form says "saved" below it.
10. Skip the basic information about your app. Click "Scopes", then "+ Add Scopes". On the left, click the category "Meeting" and select the scope `meeting:write:meeting`. Then click the category "User" and select the scope `user:read:settings`.
11. Click "Done". You can now add the Zoom integration on the Tikket Settings page.

### Daily.co

1. Open [Daily.co](https://daily.co/) and create an account.
2. In your dashboard, go to the [developers](https://dashboard.daily.co/developers) tab.
3. Copy your API key.
4. Put the API key in `.env` as `DAILY_API_KEY`.
5. If you have the [Daily Scale Plan](https://daily.co/pricing), set `DAILY_SCALE_PLAN` to `true`. This enables features like video recording.

### Basecamp

1. Open the [37 Signals Integrations Dashboard](https://launchpad.37signals.com/integrations) and sign in.
2. Click the "Register one now" link to register a new application.
3. Fill in your company details.
4. Select Basecamp 4 as the product to integrate with.
5. Set the Redirect URL for OAuth to `<Tikket URL>/api/integrations/basecamp3/callback`.
6. Click "done". Copy the Client ID and the secret into `.env` as `BASECAMP3_CLIENT_ID` and `BASECAMP3_CLIENT_SECRET`.
7. Set the `BASECAMP3_CLIENT_SECRET` variable to `{your_domain} ({support_email})`.

### HubSpot

1. Open [HubSpot Developer](https://developer.hubspot.com/) and sign in, or create an account.
2. On the home page of the developer account, go to "Manage apps".
3. Click "Create legacy app" at the top right and select "public app".
4. Fill in the "App info" tab as you like.
5. Go to the "Auth" tab.
6. Copy the Client ID and the Client Secret into `.env` as `HUBSPOT_CLIENT_ID` and `HUBSPOT_CLIENT_SECRET`.
7. Set the Redirect URL for OAuth to `<Tikket URL>/api/integrations/hubspot/callback`.
8. In the "Scopes" section at the bottom of the page, select "Read" and "Write" for the scopes `crm.objects.contacts` and `crm.lists`.
9. Click "Save" at the bottom. Tikket now creates a meeting in HubSpot for each booking with your contacts.

### Zoho CRM

1. Open the [Zoho API Console](https://api-console.zoho.com/) and sign in, or create an account.
2. In the API console, go to "Applications".
3. Click "ADD CLIENT" at the top right and select "Server-based Applications".
4. Fill in the "Client Details" tab as you like.
5. Go to the "Client Secret" tab.
6. Copy the Client ID and the Client Secret into `.env` as `ZOHOCRM_CLIENT_ID` and `ZOHOCRM_CLIENT_SECRET`.
7. Set the Redirect URL for OAuth to `<Tikket URL>/api/integrations/zohocrm/callback`.
8. If you want the same OAuth credentials for all data centers, select "Multi-DC" in the "Settings" section.
9. Click "Save" or "UPDATE" at the bottom. You can now add the Zoho CRM integration on the Tikket Settings page.

### Webex, Zoho Calendar, Zoho Bigin and Pipedrive

Each of these apps has its own readme with the steps:

- [Webex](./packages/app-store/webex/)
- [Zoho Calendar](./packages/app-store/zohocalendar/)
- [Zoho Bigin](./packages/app-store/zoho-bigin/)
- [Pipedrive](./packages/app-store/pipedrive-crm/)

### Rate limiting with Unkey

Tikket uses [Unkey](https://unkey.com) for rate limiting. Rate limiting is optional. Without Unkey, Tikket works normally without rate limiting. To enable it:

1. Create an account at [unkey.com](https://unkey.com).
2. Create a Root key with the permissions `ratelimit.create_namespace` and `ratelimit.limit`.
3. Put the root key in `.env` as `UNKEY_ROOT_KEY`.

## Content Security Policy

Set `CSP_POLICY="non-strict"` in `.env` to enable [Strict CSP](https://web.dev/strict-csp/), except for `unsafe-inline` in `style-src`. If your instance has custom changes, you can need to adapt your code to make it CSP-compatible. Strict CSP is enabled only on the login page. On other SSR pages, it runs in report-only mode to find possible problems. SSG pages do not support it yet.

## Contributing

Contributions are welcome, from a typo fix to a new feature. Read the [Contributing Guide](./CONTRIBUTING.md) for the steps, the coding standards and the commit message conventions. The [help wanted](https://github.com/threos/tikket.dev/issues?q=is:issue+is:open+label:%22%F0%9F%99%8B%F0%9F%8F%BB%E2%80%8D%E2%99%82%EF%B8%8Fhelp+wanted%22) issues are small features and bugs with a limited scope. They are a good place to start. You can also help without code: translate Tikket into your language.

<a href="https://github.com/threos/tikket.dev/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=threos/tikket.dev" />
</a>

## License

Tikket is open source under the [MIT License](./LICENSE). Tikket is built on Cal.diy and Cal.com. Cal.diy and Cal are registered trademarks of Cal.com, Inc.

## Thank you, Cal.com

Tikket exists because the Cal.com team built Cal.com in the open for years and then released Cal.diy under the MIT license. The booking engine, the availability logic, the calendar and video integrations, the embeds and the API that Tikket runs on are their work, and the work of the hundreds of people who contributed to those projects.

We did not write most of this code. We inherited it, and we are grateful for it. Tikket adds team scheduling back on top of that foundation and keeps the result open source, in the same spirit.

If you need a hosted scheduling product with enterprise features, support and a company behind it, Cal.com is the original and the best place to start: [cal.com](https://cal.com).

## Acknowledgements

Tikket also depends on these projects:

- [Vercel](https://vercel.com/)
- [Next.js](https://nextjs.org/)
- [Day.js](https://day.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://prisma.io/)

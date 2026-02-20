# Publish CSV

Publish encrypted CSV data with device-bound share links. Admins can upload a CSV, create
filtered links with one-time passwords, and review recovery requests. Viewers can only access
the rows that match the link criteria, and each link can be locked to a single device.

## What this does

- Encrypts CSV files before upload and only decrypts on the server.
- Creates share links with per-link filter criteria.
- Uses a one-time password to bind a link to a device via an HTTP-only cookie.
- Supports recovery requests that admins can approve or deny.

## Stack

- SvelteKit + TypeScript
- Supabase (Postgres + Storage)
- Bun runtime

## Usage flow

1. Admin signs in at `/admin`.
2. Upload a CSV in the CSV section (encrypted before upload).
3. Create a link with filter criteria and a one-time password.
4. Share the viewer URL `/v/{linkId}` with the recipient.
5. The recipient enters the one-time password once; the link becomes device-bound.
6. If access is lost, the recipient submits a recovery request for admin approval.

## Admin operations

- Upload and replace the active CSV.
- Create links with filter rules (eq, contains, range).
- Activate/deactivate links.
- Approve or deny recovery requests.

## Viewer behavior

- Only sees rows that match the link's filter rules.
- Uses a single one-time password per device.
- Device binding persists via an HTTP-only cookie.

## Developing

Install dependencies and start the dev server:

```sh
bun install
bun run dev

# or start the server and open the app in a new browser tab
bun run dev -- --open
```

If you prefer npm:

```sh
npm install
npm run dev
```

## Testing

Run the server-side test suite:

```sh
bun run test
```

Optional test targets:

```sh
bun run test:unit
bun run test:server
bun run test:browser
```

## Supabase setup

1. Create a Supabase project.
2. Run the schema in [supabase/schema.sql](supabase/schema.sql).
3. Create a private Storage bucket named `csv`.

## Environment variables

Copy `.env.example` to `.env` and fill in values:

```sh
SUPABASE_URL=
SUPABASE_SECRET_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ENCRYPTION_MASTER_KEY=
COOKIE_SECRET=
```

Generate keys (run twice, once per variable):

```sh
bun -e "console.log(crypto.randomBytes(32).toString('base64'))"
```

## Data retention & free plan management

To keep Supabase free tier usage under control, automatic cleanup runs daily:

- **Audit logs** are cleaned after 90 days
- **Recovery requests** (denied/resolved) are cleaned after 30 days
- **Link devices** are kept indefinitely and managed manually (not auto-deleted)

Cleanup runs automatically on server startup and once per 24 hours. No manual endpoint or secret required.

## Security notes

- Admin login is single-session; a new login invalidates the previous one.
- CSV files are encrypted with AES-256-GCM before upload and decrypted only in server routes.
- Viewer access is bound to a signed, HTTP-only cookie per link and device.
- Recovery requests are recorded with a user-agent hash and reviewed in the admin console.

## Deployment notes (Vercel)

- Ensure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set in the Vercel environment.
- Do not expose the secret key to the client.
- Storage bucket `csv` must be private.

## Troubleshooting

- `Missing env`: verify `.env` values and restart the dev server.
- Empty viewer table: check link filters and confirm CSV headers were parsed.
- Login loop: verify `ADMIN_EMAIL`/`ADMIN_PASSWORD` and that only one admin session is active.

## Building

To create a production version of your app:

```sh
bun run build
```

You can preview the production build with `bun run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

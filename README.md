# Testcase Builder

A browser app for building, saving, previewing, and exporting UAT testcase tables.

## Full Multi-User Run

Use the Node server for real shared users, login sessions, and shared testcase history:

```sh
npm start
```

Then visit `http://localhost:4174`.

Default admin:

```txt
admin / admin123
```

Set production admin credentials with environment variables before first run:

```sh
ADMIN_USERNAME=admin ADMIN_PASSWORD='change-me' npm start
```

If `ADMIN_PASSWORD` is provided later, the server updates the default admin password on startup.

Server data is stored in `data/db.json`.

For hosted deployments, use Supabase for shared persistent data. Local development still falls back to `data/db.json` when Supabase env vars are not set.

## Supabase Setup

1. Create a free Supabase project.
2. Open **SQL Editor** in Supabase.
3. Run the SQL in `supabase-schema.sql`.
4. Copy these values from Supabase project settings:
   - Project URL
   - `service_role` API key
5. Set them as server environment variables:

```sh
SUPABASE_URL='https://your-project.supabase.co'
SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
```

Keep `SUPABASE_SERVICE_ROLE_KEY` secret. It belongs on the server only and must not be pasted into frontend code.

## Deploy On Render

1. Push this folder to a GitHub repository.
2. In Render, choose **New** > **Blueprint** and select that repository.
3. Render reads `render.yaml` and creates a free web service.
4. When prompted, enter `ADMIN_PASSWORD`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
5. After deploy, open the Render service URL and sign in with the admin username/password.

The included Blueprint uses:

- `node server.js` as the start command
- `/api/health` as the health check
- Supabase as persistent shared storage when Supabase env vars are configured

## What The Server Adds

- Real login sessions with an HTTP-only cookie
- Shared users and saved test cases
- Admin can see and download all test cases
- Normal users only see and download their own test cases
- Admin-only user management

## Static Fallback

You can still serve the folder as a static app for local-only browser storage:

```sh
python3 -m http.server 4173
```

Static mode uses browser local storage / IndexedDB and is not shared between computers.

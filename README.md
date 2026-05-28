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

For hosted deployments, set `DATA_DIR` to a persistent storage path. On Render, the included `render.yaml` stores data at `/var/data`.

## Deploy On Render

1. Push this folder to a GitHub repository.
2. In Render, choose **New** > **Blueprint** and select that repository.
3. Render reads `render.yaml` and creates the web service with a persistent disk.
4. When prompted for `ADMIN_PASSWORD`, enter a strong admin password.
5. After deploy, open the Render service URL and sign in with the admin username/password.

The included Blueprint uses:

- `node server.js` as the start command
- `/api/health` as the health check
- `/var/data` as persistent storage for `db.json`

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

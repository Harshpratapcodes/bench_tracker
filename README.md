# The Bench

A personal tracker for everything you've started: projects with status, comments,
and a progress log, plus a separate skills board. Runs as a standalone server, so
it's no longer tied to a Claude conversation — same data on your phone and laptop.

## How it's built

- `server.js` — a small Express server. Two routes: `GET /api/state` and
  `PUT /api/state`. All your data lives as one JSON document in a single
  Postgres row, guarded by a shared password you set yourself.
- `public/index.html` — the UI, plain HTML/CSS/JS. Talks to the two routes
  above instead of `window.storage` (the Claude-artifact-only API it used before).

## The hosting setup: Render (app) + Neon (database)

Render's free web hosting is genuinely easy — push to Git, get a URL, no card
needed. But its own free Postgres database **expires and gets deleted after
30 days**, which is a bad foundation for something meant to last. Neon's free
Postgres tier has no such expiry — 0.5 GB storage, scale-to-zero, never deleted
for inactivity — and this app uses far less than that. So: Render hosts the
app, Neon hosts the data. They don't need to know about each other beyond one
connection string.

### 1. Set up the database (Neon)

1. Sign up at neon.tech (no card required), create a project.
2. Copy the connection string it gives you (starts with `postgresql://`,
   already includes `?sslmode=require`).

### 2. Set up the app (Render)

1. Push this folder to a GitHub repo.
2. On Render: **New +** → **Web Service** → connect the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Under Environment, add:
   - `DATABASE_URL` → the Neon connection string from step 1
   - `APP_PASSWORD` → something only you know
   - `PG_SSL` → `true`
5. Deploy. Render gives you a `https://your-app.onrender.com` URL.

(`render.yaml` in this folder mirrors these settings if you'd rather use
Render's Blueprint flow — "New +" → "Blueprint" — though setting it up by
hand in the dashboard is just as easy and easier to follow first time.)

One real-world quirk of Render's free tier: the service spins down after 15
minutes of no traffic and takes about a minute to wake back up on the next
request. Mildly annoying the first time you open it after a while, otherwise
invisible.

### Using it day to day

Open the Render URL on your phone and laptop, enter the password once on
each (it's remembered after that), and both stay in sync since they're both
just talking to the same database.

## Run it locally first (recommended before deploying)

```bash
npm install
cp .env.example .env
# edit .env: set DATABASE_URL to any Postgres you have access to,
# and PG_SSL=false if it's a local Postgres with no SSL configured
npm start
```

Open `http://localhost:3000`.

## Bring over your existing data

If you'd already added real projects in the Claude artifact version:

1. In that conversation, ask Claude to print the current state as JSON.
2. Save it as a `.json` file.
3. In this app, click **Import** in the toolbar and select that file.

Click **Export backup** occasionally afterward — cheap insurance, and the
only way to recover anything if you ever switch databases or hosts again.

## Other ways to run this

It's a completely standard Express + Postgres app, so any host that runs
Docker or a Node process works the same way — a `Dockerfile` is included.
If you'd rather not depend on any external company's free tier at all,
running it on your own machine (or a Raspberry Pi) and reaching it from
your phone via [Tailscale](https://tailscale.com) is the most durable option,
since nobody can change the terms on you.

## On the password

This is a single shared password for one person (you) — not real multi-user
auth. Reasonable for a personal tool, but anyone with both the URL and the
password can read or edit your data. Treat the URL as semi-private, and use
a password you're not reusing anywhere that matters.

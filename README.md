# WhatsApp Bot — Baileys 7.0.0-rc14

A modular, production-minded WhatsApp bot built on
**`@whiskeysockets/baileys@7.0.0-rc14`** using Node.js ES modules,
pino logging, SQLite persistence, and a plugin-style command architecture.
**Includes a web control panel** for QR pairing, phone pairing, and live
connection monitoring — deployable to Katabump, Railway, Render, Fly.io,
or any VPS.

> ⚠️ **Privacy & ToS.** This bot can only process media it legitimately
> receives through WhatsApp. It cannot bypass view-once, disappearing
> messages, or end-to-end encryption. Use it in compliance with WhatsApp's
> Terms of Service and your local laws.
>
> ⚠️ **Hosting.** The bot **cannot run on Vercel/Netlify/Cloudflare Workers**
> (serverless platforms kill functions in ≤60s and have no persistent
> filesystem). Use a platform that supports long-running processes — see
> [§3 Hosting on Katabump](#3-hosting-on-katabump).

---

## Features

- **99 commands** across 7 categories: general, group, admin, media, tools, fun, owner.
- **Secure connection lifecycle** — QR pairing, persistent auth, exponential
  backoff with jitter, duplicate-socket guard, graceful shutdown on SIGINT/SIGTERM.
- **SQLite persistence** for group settings, warnings, user prefs, cooldowns,
  command stats, reminders, and a moderation audit log.
- **Group protection modules**: antilink, antispam, antiflood, antibadword,
  antimention, antitag, antibot, welcome, goodbye, warnings with auto-escalation.
- **Media utilities**: sticker creation (sharp + ffmpeg), toimg, tomp3, tovn,
  reverse, compress, saveviewonce (privacy-respecting).
- **Optional AI integrations** via OpenAI-compatible API: ai, ask, explain,
  rewrite, summarize, translate, code, imagine, transcribe.
- **Owner-only operations**: restart, shutdown, broadcast, block/unblock,
  maintenance, backup, health, plugin reload, stats.
- **Hardened security**: env-based config, owner-verified authorization,
  input validation, path-traversal guards, per-user cooldowns, secret
  redaction in logs, parameterized SQL.
- **63 unit tests** covering parsing, permissions, security, DB ops,
  command loading, malformed message handling.

---

## 1. Requirements

- **Node.js ≥ 20** (tested on Node 22 and 24)
- **npm ≥ 10**
- **ffmpeg + ffprobe** (optional — only needed for `.tomp3`, `.tovn`,
  `.reverse`, video stickers)
- **Linux** (Pop!_OS / Ubuntu recommended); macOS works too.

### Why Node ≥ 20?

Baileys 7.0.0-rc14 declares `"engines": { "node": ">=20.0.0" }`. Earlier
versions will fail at install time.

---

## 2. Installation on Pop!_OS / Ubuntu

### 2.1 Check Node and npm

```bash
node --version    # must be v20 or higher
npm --version
```

### 2.2 Install a compatible Node.js (if needed)

Recommended: use NodeSource's Node 22 LTS.

```bash
# Pop!_OS / Ubuntu
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version    # -> v22.x
npm --version
```

### 2.3 (Optional) Install ffmpeg

Required only for audio/video conversion commands.

```bash
sudo apt-get install -y ffmpeg
ffmpeg -version
```

### 2.4 Clone / create the project

```bash
git clone <your-repo-url> whatsapp-bot
cd whatsapp-bot
# Or: copy the files from this delivery into a new directory.
```

### 2.5 Install dependencies

```bash
npm install
```

### 2.6 Configure environment

```bash
cp .env.example .env
nano .env
```

Set at minimum:

```dotenv
BOT_NAME=Spyro Bot
BOT_PREFIX=.
OWNER_JID=2547XXXXXXXX@s.whatsapp.net
LOG_LEVEL=info
```

> **OWNER_JID must be your full WhatsApp JID** — phone number in
> international format (no `+`, no spaces), followed by `@s.whatsapp.net`.

### 2.7 Start the bot

```bash
npm start
```

You will see a QR code printed in the terminal. Open WhatsApp on your
phone → Settings → Linked Devices → Link a Device → scan the QR.

Once paired, the bot will print:

```
INFO: WhatsApp connection OPEN
INFO: bot is READY
```

### 2.8 Run tests

```bash
npm test
```

### 2.9 Restart the bot

```bash
# Ctrl+C to stop, then:
npm start
```

Or use the owner command `.restart` from WhatsApp (owner only).

---

## 3. Hosting on Katabump

> ⚠️ **NOT Vercel / Netlify / Cloudflare Workers.** These are serverless
> platforms that kill functions in ≤60s and have no persistent filesystem.
> Baileys needs a long-running WebSocket (hours/days) and persistent auth
> files — Katabump supports long-running containers, so it works.

The repo includes a `Dockerfile`, `Procfile`, and `katabump.yaml` —
Katabump auto-detects the Dockerfile and builds the image for you.

---

### 3a. Deploy on Katabump (step by step)

#### Step 1 — Push the project to GitHub

```bash
cd whatsapp-bot
git init
git add .
git commit -m "Initial commit — WhatsApp bot"
git branch -M main
git remote add origin https://github.com/<you>/whatsapp-bot.git
git push -u origin main
```

#### Step 2 — Create a new service on Katabump

1. Log in to **https://dashboard.katabump.com**
2. Click **New Service** (or **Create App**) → connect your GitHub account.
3. Select your `whatsapp-bot` repo.
4. Katabump auto-detects the `Dockerfile` and uses it to build the image.

#### Step 3 — Configure the service

| Setting | Value |
|---|---|
| **Build type** | Docker (auto-detected) |
| **Port** | `3000` |
| **Health check path** | `/health` |
| **Resources** | 512 MB RAM minimum (1 GB recommended for ffmpeg) |

#### Step 4 — Set environment variables

In the Katabump dashboard, go to **Environment Variables** and add:

| Variable | Value | Required? |
|---|---|---|
| `BOT_NAME` | `Spyro Bot` | ✅ |
| `BOT_PREFIX` | `.` | ✅ |
| `OWNER_JID` | `2547XXXXXXXX@s.whatsapp.net` | ✅ |
| `LOG_LEVEL` | `info` | ✅ |
| `LOG_PRETTY` | `false` | ✅ (JSON logs in production) |
| `ENABLE_AI` | `true` | optional |
| `OPENAI_API_KEY` | `sk-...` | optional (only if `ENABLE_AI=true`) |
| `OPENAI_MODEL` | `gpt-4o-mini` | optional |

> 💡 Use Katabump's **secret/encrypted variables** feature for `OPENAI_API_KEY`
> and `OWNER_JID` so they aren't visible in the dashboard.

#### Step 5 — Attach persistent volumes (IMPORTANT)

Without persistent storage, every container restart wipes the WhatsApp
session and you must re-scan the QR code. To avoid this:

1. In the Katabump dashboard, go to **Volumes** (or **Persistent Storage**).
2. Add a volume mounted at `/app/auth_info` — name it `auth` (1 GB is plenty).
3. Add a volume mounted at `/app/data` — name it `data` (1 GB is plenty).
4. Redeploy the service.

Now the WhatsApp session and SQLite database survive restarts, deploys,
and scaling events.

#### Step 6 — Deploy and open the web UI

1. Click **Deploy** in the Katabump dashboard.
2. Watch the build logs — Katabump builds the Docker image (2-5 minutes).
3. Once deployed, Katabump gives you a public URL like
   `https://whatsapp-bot-<your-id>.katabump.app` (or a custom domain
   if you configured one).
4. **Open that URL in your browser** → the web control panel loads.
5. You'll see a "Connecting…" spinner, then a **QR code** appears.
6. Open WhatsApp on your phone → **Settings → Linked Devices → Link a Device** → scan the QR.
7. The web UI switches to **"✓ Connected"** with your bot's JID and uptime.

#### Step 7 — (Alternative) Phone pairing instead of QR

If you can't scan a QR (e.g. the QR is on the same phone as WhatsApp):

1. In the web UI, switch to the **"Phone Pairing"** tab.
2. Enter your phone number in international format (e.g. `254798081280`).
3. Click **Get Code** — an 8-character code appears (e.g. `ABCD-1234`).
4. On your phone: **WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number**.
5. Enter the code. The web UI switches to **"✓ Connected"** within seconds.

---

### 3b. Deploy via Katabump CLI (if available)

```bash
# Install Katabump CLI (if it exists)
# See Katabump docs for the exact install command.

# Login
katabump login

# Deploy from your local repo
katabump deploy --port 3000

# Or build & push a Docker image manually
docker build -t whatsapp-bot .
docker tag whatsapp-bot <katabump-registry>/whatsapp-bot
docker push <katabump-registry>/whatsapp-bot
katabump service create whatsapp-bot --image <katabump-registry>/whatsapp-bot --port 3000
```

> 📖 Check Katabump's docs at **https://docs.katabump.com** (or the dashboard)
> for the exact CLI commands and registry URL.

---

### 3c. Troubleshooting Katabump deployments

| Symptom | Fix |
|---|---|
| Build fails on `better-sqlite3` | The Dockerfile already installs `python3 make g++` — should not happen. If it does, ensure the build uses the included Dockerfile. |
| Bot starts but no QR appears | Wait 15-30s for the WebSocket to establish. Check logs in the Katabump dashboard. |
| QR appears but scanning fails | The QR expires every ~60s. Refresh the page or use phone pairing instead. |
| Connection drops repeatedly | Katabump may be restarting the container. Check resource limits — bump RAM to 1 GB. |
| Session lost after redeploy | You didn't attach persistent volumes. See Step 5 above. |
| Web UI loads but bot says "logged_out" | The session was invalidated (e.g. you removed the linked device from your phone). Delete the `/app/auth_info` volume contents and redeploy to start fresh. |
| `EADDRINUSE: address already in use :::3000` | Another process is using port 3000. Set `PORT=3001` and update the Katabump port setting. |

---

### 3d. Deploy with Docker (any host, including a VPS)

If you prefer to run on your own server or another Docker host:

```bash
# Build
docker build -t whatsapp-bot .

# Run with persistent volumes
docker run -d \
  --name whatsapp-bot \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/auth_info:/app/auth_info \
  --env-file .env \
  --restart unless-stopped \
  whatsapp-bot

# Check logs
docker logs -f whatsapp-bot

# Open the web UI
open http://localhost:3000
```

---

### 3e. Other compatible platforms

The same Dockerfile works on:

| Platform | Notes |
|---|---|
| **Render** | Easiest for getting a public web UI URL. See §3f below. |
| **Railway** | `railway up` — auto-detects Dockerfile. Add volumes via dashboard. |
| **Fly.io** | `fly launch` → `fly deploy`. Add volumes with `fly volumes create`. |
| **Koyeb** | `koyeb app deploy --git ...` — auto-detects Dockerfile. |
| **VPS** | Use Docker or systemd (see §4 below). |

---

### 3f. Deploy on Render (best for getting a pairing code remotely)

Render is the easiest way to get a **publicly reachable web UI** so you
can scan the QR or get a phone pairing code from anywhere — even if your
phone is the one with WhatsApp installed.

The repo includes a `render.yaml` Blueprint — Render auto-detects it.

#### Why Render for pairing?

- ✅ **Public URL instantly** — `https://your-bot.onrender.com`
- ✅ **No port guessing** — Render injects `PORT` automatically
- ✅ **Web UI works from any browser** — open the URL on your phone if needed
- ✅ **Free tier** — 512 MB RAM (more than Katabump's 308 MiB)
- ⚠️ **Free tier sleeps after 15 min idle** — bot self-pings every 10 min to prevent this (see `src/services/keepalive.js`)

#### Step-by-step

1. **Push to GitHub** (already done — repo is at
   https://github.com/lingzi3628-dot/SPYROWHATSAPPBOT)

2. Go to **https://dashboard.render.com** → sign in with GitHub

3. Click **New +** → **Blueprint**

4. Select your repo `lingzi3628-dot/SPYROWHATSAPPBOT`

5. Render auto-detects `render.yaml` and shows the service config

6. Review the environment variables (already in `render.yaml`):
   - `BOT_NAME` = `Spyro Bot`
   - `OWNER_JID` = `254798081280@s.whatsapp.net` (change if needed)
   - `LOG_LEVEL` = `info`
   - `LOG_PRETTY` = `false`
   - `PORT` = `3000` (Render will override this with its own port)

7. Click **Apply** → Render builds the image (2-5 min)

8. Once deployed, Render gives you a URL like:
   `https://spyro-whatsapp-bot.onrender.com`

9. **Open that URL in your browser** → web UI loads

10. Wait 10-15s for the QR to appear (status badge: "QR Ready")

11. **Pair with WhatsApp:**
    - **QR option:** Scan the QR with your phone (WhatsApp → Settings → Linked Devices → Link a Device)
    - **Phone pairing option:** Click "Phone Pairing" tab → enter `254798081280` → get 8-char code → enter on your phone

12. The web UI shows **"✓ Connected"** with your bot's JID

#### Persistent session on Render

Without a persistent disk, every Render deploy/restart wipes the WhatsApp
session and you must re-scan the QR. The `render.yaml` already includes a
1 GB disk at `/app/data` (paid feature — $0.25/mo).

To also persist the WhatsApp auth session:
- Edit `render.yaml` → change `mountPath` from `/app/data` to `/app`
- This persists both `auth_info/` and `data/` (but also `node_modules/`,
  which is fine — Render caches it anyway)

Or use a single disk and symlink:
```bash
# In Render shell (after deploy):
ln -s /app/data/auth_info /app/auth_info
```

#### Free tier limitations

| Limit | Affects bot? |
|---|---|
| 512 MB RAM | No — bot idles at ~160 MB |
| Sleeps after 15 min idle | **Yes** — bot disconnects. Self-ping keepalive prevents this (already included) |
| 750 hours/month | No — one bot uses ~720 hours |
| No persistent disk on free | **Yes** — session is wiped on every deploy. Pay $0.25/mo for a disk, or accept re-scanning |

#### Switching from Render to Katabump (or vice versa)

The bot runs identically on both. To move:

1. **Export the session** from Render:
   - Open Render shell → download `auth_info/` folder contents
2. **Import to Katabump**:
   - Upload the `auth_info/` files via Katabump File Manager
3. Restart the bot on Katabump — it picks up the existing session

Or just re-scan the QR on the new platform (the old session gets logged out
when you link a new device — WhatsApp limits you to ~4 linked devices).

---

## 4. Running as a systemd service (user-level)

Create `~/.config/systemd/user/whatsapp-bot.service`:

```ini
[Unit]
Description=WhatsApp Bot (Baileys)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=%h/whatsapp-bot
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
```

Enable and start:

```bash
systemctl --user daemon-reload
systemctl --user enable --now whatsapp-bot.service
systemctl --user status whatsapp-bot.service
```

View logs:

```bash
journalctl --user -u whatsapp-bot.service -f
```

Stop / restart:

```bash
systemctl --user stop whatsapp-bot
systemctl --user restart whatsapp-bot
```

---

## 4. Project structure

```
whatsapp-bot/
├── package.json
├── .env.example
├── .gitignore
├── Dockerfile              # Container build (Katabump/Railway/Render/Fly)
├── .dockerignore
├── katabump.yaml           # Katabump deployment config
├── Procfile                # Fallback for non-Docker hosts
├── README.md
├── data/                   # SQLite DB lives here (gitignored)
├── auth_info/              # Baileys session (gitignored)
├── tmp/                    # temp media files (gitignored)
├── scripts/
│   ├── run-tests.js
│   ├── pair-phone.js       # CLI phone-pairing helper
│   ├── show-qr.js          # CLI QR generator
│   └── db-test.mjs
├── src/
│   ├── index.js            # entry point — starts web UI + bot
│   ├── config.js           # env validation
│   ├── connection.js       # Baileys socket lifecycle + event bus
│   ├── handler.js          # central message handler & command engine
│   ├── message.js          # message send helpers + context builder
│   ├── logger.js           # pino + secret redaction
│   ├── database.js         # SQLite schema + lazy prepared statements
│   ├── security.js         # input validation, path traversal guards
│   ├── permissions.js      # owner / admin / user authorization
│   ├── scheduler.js        # reminder polling
│   ├── utils/
│   │   ├── jid.js
│   │   ├── text.js
│   │   ├── media.js
│   │   ├── groups.js
│   │   └── formatting.js
│   ├── services/
│   │   ├── ai.js           # OpenAI-compatible adapter
│   │   └── media.js        # sharp + ffmpeg helpers
│   ├── events/
│   │   ├── messages.js
│   │   ├── groups.js
│   │   └── connection.js
│   ├── plugins/
│   │   └── index.js
│   ├── web/                # Web control panel (Express)
│   │   ├── server.js       # REST + SSE endpoints
│   │   └── public/
│   │       └── index.html  # single-page UI (QR, pairing, status, logs)
│   └── commands/
│       ├── general/   (21 commands)
│       ├── group/     (22 commands)
│       ├── admin/     (17 commands)
│       ├── media/     (12 commands)
│       ├── tools/     (16 commands)
│       ├── fun/       (14 commands)
│       └── owner/     (17 commands)
└── tests/                  # 8 test files, 63 tests
```

---

## 5. Command reference

### General (21)

| Command | Description |
|---|---|
| `.ping` | Response latency. |
| `.alive` | Bot status, uptime, connection health. |
| `.menu [category]` | Organized command menu. |
| `.help <command>` | Help for a specific command. |
| `.owner` | Show the configured owner contact. |
| `.botinfo` | Version, runtime, bot information. |
| `.runtime` | Formatted uptime. |
| `.groupinfo` | Group subject, members, admins, settings. |
| `.profile` | Supported public profile information. |
| `.jid` | Current chat and sender identifiers. |
| `.quote` | Reply with a quoted message. |
| `.time` | Current time. |
| `.date` | Current date. |
| `.rules` | Configured group rules. |
| `.support` | Support information. |
| `.report` | Report a bug or moderation concern. |
| `.feedback` | Submit feedback to the owner. |
| `.donate` | Donation information. |
| `.settings` | Show permitted settings. |
| `.language` | Select a supported interface language. |

### Group administration (22)

`tagall`, `hidetag`, `admins`, `groupinfo`, `promote`, `demote`, `kick`,
`add`, `invite`, `revokeinvite`, `setname`, `setdesc`, `open`, `close`,
`lock`, `unlock`, `warn`, `warnings`, `resetwarn`, `poll`, `announce`,
`delete` (alias: `revoke`).

All admin commands require the sender to be a group admin (or the owner)
and the bot to be a group admin where applicable.

### Group protection & automation (17)

`.antilink`, `.antispam`, `.antiflood`, `.antibadword`, `.antimention`,
`.antitag`, `.antibot`, `.welcome`, `.goodbye`, `.setwelcome`,
`.setgoodbye`, `.setrules`, `.setwarnlimit`, `.setmute`, `.setprefix`,
`.resetsettings`.

Plus automatic welcome / goodbye on group join/leave with template
substitution: `{user}`, `{group}`, `{count}`.

### Media (12)

`mediahelp`, `saveviewonce`, `viewonceinfo`, `voiceinfo`, `transcribe`
(alias `audiototext`), `sticker`, `toimg`, `tomp3`, `tovn`, `reverse`,
`compress`.

> **Privacy:** `saveviewonce` only saves media that the bot can already
> access via Baileys' standard download API. It does **not** bypass
> view-once encryption.

### Tools / utilities (16)

`calc`, `qr`, `shorten`, `weather`, `translate`, `define`, `wiki`,
`currency`, `remind`, `schedule`, `ai`, `ask`, `explain`, `rewrite`,
`summarize`, `code`, `imagine`.

AI commands require `ENABLE_AI=true` + `OPENAI_API_KEY`. Weather requires
`OPENWEATHER_API_KEY`. The bot runs fine without any of these — affected
commands return a friendly "not configured" message.

### Fun (14)

`joke`, `meme`, `fact`, `quote`, `ship`, `love`, `rate`, `truth`, `dare`,
`8ball`, `dice`, `coinflip`, `riddle`, `quiz`.

### Owner-only (17)

`restart`, `shutdown`, `broadcast`, `setbotname`, `setprefix`, `setbio`,
`setstatus`, `pluginlist`, `pluginreload`, `stats`, `groups`, `block`,
`unblock`, `maintenance`, `setloglevel`, `backup`, `health`.

> `.eval` is intentionally **not implemented** — arbitrary JS evaluation
> is forbidden in production.

---

## 6. Configuration reference

See `.env.example` for the full list. Highlights:

| Variable | Default | Purpose |
|---|---|---|
| `BOT_NAME` | WhatsApp Bot | Display name used in menus. |
| `BOT_PREFIX` | `.` | Command prefix. |
| `OWNER_JID` | (empty) | Owner's full WhatsApp JID. **Required for owner commands.** |
| `SESSION_DIR` | `./auth_info` | Baileys auth state directory. |
| `DATABASE_PATH` | `./data/bot.sqlite` | SQLite database location. |
| `LOG_LEVEL` | `info` | trace/debug/info/warn/error/fatal. |
| `LOG_PRETTY` | `true` | Pretty colored logs (set `false` in prod for JSON). |
| `MAX_MEDIA_MB` | `20` | Media download size cap. |
| `COMMAND_COOLDOWN` | `3` | Per-user cooldown seconds. |
| `DEFAULT_WARN_LIMIT` | `3` | Warnings before auto-removal. |
| `MAINTENANCE_MODE` | `false` | Only owner can use the bot. |
| `ENABLE_AI` | `false` | Enable AI commands. |
| `OPENAI_API_KEY` | (empty) | OpenAI-compatible API key. |
| `OPENWEATHER_API_KEY` | (empty) | For `.weather`. |

---

## 7. Security model

- **Owner verification** is server-side, comparing the sender JID against
  the env-configured `OWNER_JID`. Sender-supplied JIDs are never trusted.
- **Group admin checks** use live `groupMetadata` lookups, not cached state.
- **Per-user cooldowns** are enforced via SQLite.
- **Anti-link / anti-badword / anti-flood** modules delete violating
  messages only when the bot is admin, and **never lie about deletions**.
- **Path traversal** is blocked via `safeFileName()`.
- **Shell injection** patterns are detected by `looksLikeShellInjection()`.
- **Secrets are redacted** in pino logs via the `redact` config.
- **SQL is parameterized** everywhere — `db.prepare(...)` with `?` placeholders.
- **`.env` is gitignored** along with `auth_info/`, `data/`, `tmp/`.

---

## 8. Session recovery

If your `auth_info/` directory becomes corrupted (e.g. after a crash
mid-write), the bot may fail to connect. Recovery:

```bash
# Stop the bot
systemctl --user stop whatsapp-bot   # or Ctrl+C

# Back up the corrupted session
mv auth_info auth_info.broken-$(date +%s)

# Restart — a new QR will be printed; re-scan
npm start
```

If `DisconnectReason.loggedOut` is received, **the session is permanently
invalid** and you must re-scan from scratch.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Bot won't start, "Configuration errors" | Bad `.env` values | Check `OWNER_JID` format, `BOT_PREFIX` length, `LOG_LEVEL`. |
| QR not appearing | Terminal too narrow | Make terminal ≥ 80 columns, or check `LOG_LEVEL=info`. |
| Reconnect loop | Network instability or rate limit | Wait 60s; if persists, delete `auth_info/` and re-scan. |
| `loggedOut` on startup | Session invalidated (e.g. linked device removed) | Delete `auth_info/`, re-scan QR. |
| `.tomp3` / `.tovn` fail | ffmpeg missing | `sudo apt install ffmpeg`. |
| AI commands say "not configured" | `ENABLE_AI=false` or no `OPENAI_API_KEY` | Edit `.env` and restart. |
| `better-sqlite3` install fails | Build tools missing | `sudo apt install python3 make g++`. |
| Tests report native crash | Known better-sqlite3 teardown issue | Re-run `npm test`; the runner retries automatically. |

### View live logs

```bash
# foreground
npm start

# systemd
journalctl --user -u whatsapp-bot -f
```

### Increase log verbosity

Edit `.env`:

```dotenv
LOG_LEVEL=debug
```

Or at runtime (owner only): `.setloglevel debug`.

---

## 10. Development

### Hot reload (dev mode)

```bash
npm run dev
# node --watch src/index.js
```

### Add a new command

Create `src/commands/<category>/<name>.js`:

```js
export default {
  name: 'hello',
  aliases: ['hi'],
  category: 'general',
  description: 'Say hello.',
  usage: '.hello',
  // ownerOnly: false,
  // adminOnly: false,
  // groupOnly: false,
  // privateOnly: false,
  // botAdminRequired: false,
  // cooldown: 5,
  async execute(ctx) {
    await ctx.reply('Hello, world!');
  },
};
```

Then either restart the bot, or run `.pluginreload` as the owner.

### Add a plugin (lifecycle hook)

Drop a file in `src/plugins/` (e.g. `logger.js`):

```js
export default {
  name: 'logger',
  async onMessage(ctx) {
    // return true to stop further processing
    return false;
  },
};
```

---

## 11. Testing

```bash
npm test
```

Test files (in `tests/`):

| File | Tests |
|---|---|
| `config.test.js` | Configuration validation. |
| `database.test.js` | Group settings, warnings, cooldowns, audit log. |
| `handler.test.js` | Command loading, prefix matching, text extraction. |
| `jid.test.js` | JID normalization, group/broadcast detection. |
| `malformed.test.js` | Handler does not throw on null / empty / edited messages. |
| `parse.test.js` | Argument parsing, sanitization, chunking, templates. |
| `permissions.test.js` | Owner / admin / user authorization, maintenance mode. |
| `security.test.js` | Shell-injection / path-traversal / URL / badword detection. |

> **Note on the test runner:** better-sqlite3's native `Statement`
> destructors crash during V8 teardown. This is a known issue and does
> **not** indicate a test failure. `scripts/run-tests.js` detects the
> crash and retries the affected file (up to 6 times).

---

## 12. Privacy & legal notes

- This bot uses the **Baileys** library which speaks WhatsApp's web
  protocol. Using automated clients may violate WhatsApp's Terms of
  Service. You are responsible for any account suspension.
- The bot only processes media that is **delivered to it normally** —
  it cannot decrypt view-once messages it wasn't sent, retrieve
  disappearing messages after they vanish, or access E2EE content
  without the keys.
- Donor / support / donation strings in `.env.example` are placeholders.
- The included bad-word list is a default; replace or extend it in
  `src/security.js` to suit your community.

---

## 13. License

Provided as-is for educational and operational use. The Baileys library
is licensed by WhiskeySockets under MIT. Review `node_modules` for the
full license texts of all dependencies.

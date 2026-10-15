# Deploying on Katabump (Pterodactyl Panel)

This guide walks you through deploying the Spyro WhatsApp Bot on Katabump,
which uses **Pterodactyl** as its game/server panel.

---

## Prerequisites

- A Katabump account → https://dashboard.katabump.com
- The bot code on your server (either uploaded via the panel's File Manager,
  or pulled from GitHub: https://github.com/lingzi3628-dot/SPYROWHATSAPPBOT)
- The 308 MiB plan works (bot idles at ~160 MB), but 512+ MiB is recommended
  if you enable AI features or process lots of media

---

## Step 1 — Create a Server

1. Log in to **https://dashboard.katabump.com**
2. Go to **Servers** → **Create Server** (or "New Server")
3. Configure:
   - **Name:** `spyro-bot` (or whatever you like)
   - **Server Type / Egg:** **Node.js** (look for "Node.js" in the egg list)
   - **Memory:** 512 MiB minimum (308 MiB works but is tight)
   - **Disk:** 1024 MiB minimum (for SQLite + session + temp media)
   - **CPU:** 100% (or 50% if you want to share)

4. Click **Create Server** and wait for it to provision.

---

## Step 2 — Upload the Bot Code

You have two options:

### Option A — Upload ZIP via File Manager

1. Download `spyrowhatsappbot.zip` (or download from GitHub:
   https://github.com/lingzi3628-dot/SPYROWHATSAPPBOT → Code → Download ZIP)
2. In the Katabump panel, go to your server → **File Manager** tab
3. Click **Upload** → select the ZIP
4. Right-click the ZIP → **Extract** (or use the "Unarchive" button)
5. You should now see `index.js`, `package.json`, `src/`, etc. in the
   server root

### Option B — Pull from GitHub via the Console

1. Go to your server → **Console** tab → click **Start**
2. Wait for it to fail (it will, since there's no `index.js` yet) — that's OK
3. In the console, type:
   ```
   git clone https://github.com/lingzi3628-dot/SPYROWHATSAPPBOT.git .
   ```
   (Note the `.` at the end — clones into the current directory)
4. If `git` isn't available in the egg, use Option A instead

---

## Step 3 — Install Dependencies

In the **Console** tab, run:

```
npm install
```

This takes 1-3 minutes. You'll see output like:
```
added 240 packages, and audited 241 packages in 1m
```

> ⚠️ If you see errors about `better-sqlite3` failing to build, the egg
> doesn't have build tools. Either:
> - Use the included **Dockerfile** instead (see "Docker egg" section below)
> - Or ask Katabump support to enable build tools for Node.js eggs
> - Or switch to a "Generic Node.js" egg that includes `python3 make g++`

---

## Step 4 — Configure the Startup

Go to the **Startup** tab and set:

| Setting | Value |
|---|---|
| **Node JS File** (or "Index File") | `index.js` |
| **Additional Arguments** | (leave blank) |

The `index.js` at the repo root automatically forwards to `src/index.js`,
so the default Pterodactyl startup works without changes.

> 💡 If you want to skip the root `index.js` wrapper, set the Index File
> to `src/index.js` directly. Both work.

---

## Step 5 — Set Environment Variables

Go to the **Startup** tab → **Server Environment Variables** (or in some
panels, it's under **Settings → Variables**). Add:

| Variable | Value | Required |
|---|---|---|
| `BOT_NAME` | `Spyro Bot` | ✅ |
| `BOT_PREFIX` | `.` | ✅ |
| `OWNER_JID` | `254798081280@s.whatsapp.net` | ✅ |
| `LOG_LEVEL` | `info` | ✅ |
| `LOG_PRETTY` | `false` | ✅ (JSON logs in production) |
| `PORT` | `3000` | ✅ |
| `HOST` | `0.0.0.0` | ✅ |
| `MAX_MEDIA_MB` | `20` | optional |
| `ENABLE_AI` | `false` | optional |
| `OPENAI_API_KEY` | (your key) | optional (only if ENABLE_AI=true) |

> ⚠️ If you uploaded the ZIP that includes `.env`, you can skip this step
> — the `.env` file already has these values. But setting them in the
> panel is more reliable (they override `.env`).

---

## Step 6 — (Optional but recommended) Configure `.env`

If you'd rather use a `.env` file instead of panel variables:

1. Go to **File Manager** → click `.env` (or create it from `.env.example`)
2. Edit the values:
   ```dotenv
   BOT_NAME=Spyro Bot
   BOT_PREFIX=.
   OWNER_JID=254798081280@s.whatsapp.net
   LOG_LEVEL=info
   LOG_PRETTY=false
   PORT=3000
   HOST=0.0.0.0
   ```
3. Save

---

## Step 7 — Start the Server

1. Go to the **Console** tab
2. Click **Start**
3. Watch the console output. You should see:
   ```
   [INFO]: database initialized
   [INFO] (Spyro Bot): starting bot
   [INFO]: 🌐 Web UI: http://0.0.0.0:3000
   [INFO]: connecting to WhatsApp…
   [INFO]: QR code ready — scan via web UI or terminal
   ```
4. The console will also print the QR code as ASCII art — you can scan
   it directly from the console with your phone if the panel renders it
   cleanly. If the ASCII is distorted, use the web UI instead (Step 8).

---

## Step 8 — Open the Web UI

Katabump assigns your server a public address. Find it in the
**Settings** tab → **Server Address** (or "Allocation"). It looks like:

```
some-name.katabump.app:12345
```

(The port number at the end is the allocated port — it might NOT be 3000.
Check what port Katabump assigned and set `PORT` env var to match, OR
just use the allocated port in the URL below.)

Open in your browser:
```
http://<your-server-address>:<allocated-port>/
```

You'll see the bot's web control panel:
- **QR Code tab** — wait for the QR to appear, scan with your phone
- **Phone Pairing tab** — enter `254798081280`, get an 8-char code

Once paired, the web UI shows **"✓ Connected"** with your bot's JID.

---

## Step 9 — Test the Bot

Send these commands to your WhatsApp (from any chat where the bot is
present, including DMs to yourself):

```
.ping         → bot replies with latency
.menu         → full command menu (114 commands)
.alive        → bot status + uptime
.help ping    → help for a specific command
```

---

## Troubleshooting

### "Your index.js file was not found"
**Cause:** Pterodactyl can't find the entry point.
**Fix:** Either:
- Make sure `index.js` exists at the server root (it does in this repo)
- OR go to **Startup** tab → change "Index File" to `index.js`
- OR change it to `src/index.js` (skips the root wrapper)

### "Cannot find module 'better-sqlite3'"
**Cause:** Dependencies weren't installed.
**Fix:** Run `npm install` in the console. If it fails with native build
errors, the egg lacks build tools — use a Docker egg instead (see below).

### Server crashes with "Out of memory"
**Cause:** 308 MiB is too tight if you process lots of media or enable AI.
**Fix:**
- Upgrade to a 512 MiB or 1 GiB plan, OR
- Disable AI features (`ENABLE_AI=false`), OR
- Reduce `MAX_MEDIA_MB` to `10`, OR
- Edit `.env` and set `LOG_LEVEL=warn` (less logging = less memory)

### QR doesn't appear in console
**Cause:** Pterodactyl's console may distort ASCII art.
**Fix:** Use the web UI instead — open `http://<server-address>:<port>/`
in your browser. The QR renders as a clean PNG image there.

### QR appears but scanning fails
**Cause:** The QR expired (they rotate every ~60s).
**Fix:** Refresh the web UI page or wait for a new QR. Or use phone pairing
instead (Phone Pairing tab → enter your number → get an 8-char code).

### "logged_out" after restart
**Cause:** The WhatsApp session was invalidated (e.g. you removed the
linked device from your phone, or you linked too many devices).
**Fix:**
1. Delete the `auth_info/` folder via File Manager
2. Restart the server
3. Re-scan the QR or re-pair with phone

### Session lost after server restart
**Cause:** Pterodactyl containers are ephemeral by default — filesystem
changes don't persist across restarts.
**Fix:**
- **Option A:** Use the included SQLite database for settings (already
  implemented — settings survive in `data/bot.sqlite`)
- **Option B:** For the WhatsApp session (`auth_info/`), you need a
  persistent volume. In Katabump, look for "Mounts" or "Volumes" in
  the server settings and mount `/home/container/auth_info` to a
  persistent volume.
- **Option C:** Manually back up `auth_info/` before stopping and
  restore it after starting (download via File Manager, upload back).

### Web UI not reachable
**Cause:** The port isn't exposed, or you're using the wrong URL.
**Fix:**
1. Check the **Settings** tab for the allocated port
2. Make sure `PORT` env var matches the allocated port
3. Open `http://<server-address>:<port>/` (not https)

---

## Alternative: Use a Docker Egg

If the Node.js egg doesn't have build tools (causing `better-sqlite3`
to fail), use a Docker-based egg instead:

1. In Katabump, create a server with a **Docker** egg (or "Generic Docker")
2. Set the **Image** to: `node:22-slim`
3. Upload the repo (including `Dockerfile`)
4. Set the startup command to: `docker build -t whatsapp-bot . && docker run -p 3000:3000 whatsapp-bot`
   (Or just use the Dockerfile directly if the egg supports it)
5. The Dockerfile already installs `python3 make g++ ffmpeg` — no
   manual dependency issues

---

## Memory Limits by Plan

| Plan (RAM) | Works? | Notes |
|---|---|---|
| 308 MiB | ✅ (tight) | Bot idles at ~160 MB. Avoid AI + heavy media. |
| 512 MiB | ✅ (comfortable) | Default recommendation. Handles media well. |
| 1 GiB | ✅ (roomy) | AI features work. Multiple groups. |
| 2+ GiB | ✅ (overkill) | Only for high-traffic bots. |

---

## Need More Help?

- **Bot README:** `README.md` in the repo (full command list + config)
- **Quick start:** `START-HERE.md` in the repo
- **Baileys docs:** https://github.com/WhiskeySockets/Baileys
- **Katabump support:** check their Discord/support center (link in dashboard)

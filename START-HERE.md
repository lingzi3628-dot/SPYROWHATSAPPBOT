# 🚀 START HERE — Get Your Bot Running in 3 Steps

This guide gets you from download to a working WhatsApp bot in under 5 minutes.

---

## What You'll Need

- A computer with **Node.js 20+** installed → https://nodejs.org
- A phone with **WhatsApp** installed
- 5 minutes

> **Need to install Node.js?**
> - **Windows / Mac:** Download from https://nodejs.org (pick the LTS button)
> - **Ubuntu / Pop!_OS / Debian:**
>   ```bash
>   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
>   sudo apt install -y nodejs
>   ```
> - **Optional:** `ffmpeg` (only needed for media commands like `.tomp3`, `.tovn`, `.sticker` from video)
>   - Ubuntu: `sudo apt install ffmpeg`
>   - Mac: `brew install ffmpeg`
>   - Windows: download from https://ffmpeg.org

---

## Step 1 — Install Dependencies

Open a terminal in this folder and run **ONE** of these:

### macOS / Linux
```bash
./start.sh
```

### Windows
```
double-click start.bat
```

### Or manually
```bash
npm install
npm start
```

The first run installs ~240 packages and takes 1-2 minutes. Subsequent runs are instant.

---

## Step 2 — Open the Web UI

When the bot starts, you'll see this in your terminal:

```
🌐 Web UI: http://localhost:3000
```

**Open that URL in your browser.** You'll see a dark-themed control panel with:

- A **status badge** (top right) — "Connecting…"
- A **QR code** that appears after 5-15 seconds
- Two tabs: **QR Code** and **Phone Pairing**

---

## Step 3 — Pair with WhatsApp

You have **two options** — pick whichever is easier:

### Option A — Scan the QR code (easiest)

1. Wait for the QR code to appear in the web UI (5-15 seconds)
2. Open **WhatsApp** on your phone
3. Go to **Settings → Linked Devices → Link a Device**
4. Point your phone's camera at the QR code on your computer screen
5. The web UI switches to **"✓ Connected"** with your bot's JID

> The QR refreshes every ~60 seconds. If it expires before you scan, just wait — a new one appears automatically.

### Option B — Phone pairing code (if QR is hard to scan)

1. In the web UI, click the **"Phone Pairing"** tab
2. Enter your phone number in international format (e.g. `254798081280`)
3. Click **"Get Code"**
4. An 8-character code appears (e.g. `ABCD-1234`) — click **Copy**
5. On your phone: **WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number**
6. Type the 8-character code
7. The web UI switches to **"✓ Connected"** within seconds

---

## Step 4 — Test the Bot

Once connected, send these commands to **your own WhatsApp** (the bot account) from any other phone, or from a group where the bot is a member:

```
.ping         → bot replies with latency
.menu         → full command menu (114 commands)
.alive        → bot status + uptime
.help ping    → help for a specific command
```

Try `.menu` first — it shows every command grouped by category.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `❌ Node.js is not installed` | Install Node.js 20+ from https://nodejs.org |
| `npm install` fails | Run `npm install` again — sometimes the network hiccups |
| Web UI says "Connecting…" forever | Wait 30s. If still stuck, check your internet. The bot needs to reach WhatsApp servers. |
| QR doesn't appear | Make sure port 3000 isn't blocked. Try a different port: edit `.env` → `PORT=3001` |
| QR scans but says "Logged out" | Delete the `auth_info/` folder and restart — you'll get a fresh QR |
| Phone pairing code won't generate | Wait until the status badge says "QR Ready" (means the socket is ready for pairing) |
| Bot was working but stopped | Restart with `./start.sh` — it auto-reconnects. If "logged_out", delete `auth_info/` and re-scan |

---

## File Overview

```
whatsapp-bot/
├── start.sh / start.bat    ← Run this first!
├── .env                    ← Your config (OWNER_JID is pre-filled)
├── README.md               ← Full documentation
├── src/
│   ├── index.js            ← Entry point
│   ├── web/
│   │   └── public/
│   │       └── index.html  ← The web UI you see at localhost:3000
│   └── commands/           ← 114 commands
├── Dockerfile              ← For Katabump / Docker deployment
├── katabump.yaml           ← Katabump config
└── tests/                  ← 63 unit tests (run with `npm test`)
```

---

## Deploy to Katabump (Cloud — Always On)

Once the bot works locally, you can deploy it to Katabump so it stays online 24/7:

1. **Push to GitHub** (the repo is already on GitHub at
   https://github.com/lingzi3628-dot/SPYROWHATSAPPBOT)
2. **Log in to Katabump** → https://dashboard.katabump.com
3. **New Service** → connect GitHub → select `SPYROWHATSAPPBOT`
4. Katabump auto-detects the `Dockerfile`
5. Set env vars: `BOT_NAME`, `OWNER_JID`, `LOG_LEVEL`, `LOG_PRETTY=false`
6. Port: `3000` · Health check: `/health`
7. **Attach volumes** (IMPORTANT — so session survives restarts):
   - `/app/auth_info` (1 GB)
   - `/app/data` (1 GB)
8. Deploy → open the Katabump URL → scan QR / pair with phone

See **README.md §3** for the full Katabump guide.

---

## Need Help?

- Full docs: **README.md**
- Baileys library: https://github.com/WhiskeySockets/Baileys
- Run tests: `npm test`

**Happy botting! 🤖**

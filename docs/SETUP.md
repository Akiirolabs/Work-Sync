# Local setup guide

This guide covers a first-time development setup and the normal local workflow.

## 1. Install prerequisites

Install Git, Node.js 22 or newer, and Corepack. Verify them:

```bash
git --version
node --version
corepack --version
```

Enable pnpm:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

This project uses pnpm. Do not use `npm install`, because `pnpm-lock.yaml` is the authoritative dependency lockfile.

## 2. Clone the repository

Start in the parent directory where the project should live. Git creates the project folder:

```bash
git clone git@github.com:Akiirolabs/Work-Sync.git Work-Sync
cd Work-Sync
```

If you already created an empty folder named `Work-Sync`, clone into that current empty folder:

```bash
git clone git@github.com:Akiirolabs/Work-Sync.git .
```

Confirm the checkout:

```bash
git remote -v
git branch --show-current
git status
```

The expected branch is `main`.

## 3. Install dependencies

```bash
pnpm install --frozen-lockfile
```

## 4. Configure the local environment

macOS or Linux:

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `KNOWLEDGE_DB_PATH` | SQLite database path; defaults to `./data/knowledge.db` |
| `KNOWLEDGE_API_KEY` | Optional credential for external API clients |
| `KNOWLEDGE_MAX_UPLOAD_BYTES` | Upload-size ceiling |
| `KNOWLEDGE_RATE_LIMIT_MAX` | Verification requests allowed per rate-limit window |
| `KNOWLEDGE_RATE_LIMIT_WINDOW_MS` | Rate-limit window length |
| `OPENAI_API_KEY` | Server-only key for the Agent side chat |

Add a real OpenAI key only if you need to test Agent responses:

```env
OPENAI_API_KEY=your_real_key
```

Never commit `.env.local`, and never rename the key to `NEXT_PUBLIC_OPENAI_API_KEY`.

## 5. Start development

```bash
pnpm dev
```

Open [http://localhost:3002](http://localhost:3002).

## 6. Run the checks

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

Run the optimized production build locally with:

```bash
pnpm start
```

Stop a running foreground command with `Ctrl+C`.

## Common problems

### Port 3002 is already in use

On Windows:

```powershell
netstat -ano | Select-String ':3002'
Get-Process -Id <PID>
Stop-Process -Id <PID>
```

On macOS or Linux:

```bash
lsof -i :3002
kill <PID>
```

Confirm the process belongs to Work Sync before stopping it.

### A generated Next.js module is missing

Errors such as `Cannot find module './817.js'` usually indicate a stale or partially replaced `.next` build. Stop the app before rebuilding:

```bash
pnpm run build
pnpm start
```

If the generated directory remains corrupt, remove only this repository's `.next` directory after confirming the app is stopped, then rebuild.

### Agent says to sign in

The Agent endpoint requires a valid Work Sync account session. Create an account or sign in through Settings.

### Agent says the API key is not configured

Add `OPENAI_API_KEY` to `.env.local`, stop the app, and start it again. Environment changes are loaded when the Node.js process starts.

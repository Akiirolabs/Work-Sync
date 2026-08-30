# Work Sync

Work Sync is a dark-themed internal workspace for notes, tasks, structured tables, source verification, reusable macros, and a lightweight AI side chat.

The application is built with Next.js 15, React 19, TypeScript, Node.js 22, and SQLite. It runs locally on port `3002` and can be deployed as a Node.js service behind Nginx and Cloudflare.

## Current features

- Account creation, sign-in, secure session cookies, and sign-out.
- Workspace notes with multiline selection and line-formatting controls.
- To Do tasks with descriptions, due dates, subtasks, one nested level, filters, and drag ordering.
- Tables with configurable columns, select options, page cells, custom symbols, and scoped page editors.
- More than 50 macro presets, custom macros, text presets, Vault organization, and six Main Macro shortcuts.
- Compact and circular Macro Panels; the circular panel opens by click or `Ctrl+M`.
- Sources, verification results, fixes, and history.
- Authenticated, streaming Agent side chat using `gpt-5-mini`; it has no tools or external-action permissions.

## Storage at a glance

| Data | Storage | Account scoped |
| --- | --- | --- |
| Users and sessions | SQLite | Yes |
| Workspace notes | SQLite | Yes |
| Sources and verification records | SQLite | Yes |
| Tables, To Dos, macros, and drafts | Browser `localStorage` | Yes, by local user namespace |
| Open Agent conversation | React session state | Only for the open browser session |

Browser-stored data does not automatically follow a user to another device. See [Architecture](docs/ARCHITECTURE.md) and [Roadmap](docs/ROADMAP.md) for planned durability work.

## Quick start

Requirements:

- Node.js 22 or newer
- pnpm through Corepack

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3002](http://localhost:3002).

On PowerShell, copy the environment file with:

```powershell
Copy-Item .env.example .env.local
```

The Agent requires a server-side `OPENAI_API_KEY`. Never commit a real key or expose it through a `NEXT_PUBLIC_` variable.

## Validation

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

Do not run `pnpm run build` while `pnpm start` is serving the same `.next` directory. Stop the production process first.

## Documentation

- [Local setup](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)

## Repository

```text
git@github.com:Akiirolabs/Work-Sync.git
```

The production branch is `main`.

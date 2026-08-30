# Architecture

## System overview

Work Sync is a single Next.js application with React client interfaces, Node.js route handlers, and an embedded SQLite database.

```text
Browser
  ├─ App shell, Workspace, To Do, Tables, Sources, Verify, History
  ├─ User-scoped localStorage for device-local features
  └─ Same-origin API requests with work_sync_session cookie
         │
         ▼
Next.js Node.js server
  ├─ Account and session routes
  ├─ Notes, Sources, verification, and history routes
  ├─ Streaming Agent proxy
  └─ API-key and rate-limit guards
         │
         ├─ SQLite database
         └─ OpenAI Responses API for Agent text generation
```

In production, Cloudflare handles the public edge connection, Nginx handles origin TLS and reverse proxying, and the `work-sync` systemd service runs Next.js on `127.0.0.1:3002`.

## Application shell

`src/components/AppShell.tsx` owns the global layout:

- Top status bar and account settings.
- Collapsible navigation rail.
- AO macro menu and Macro Panels.
- Docked Agent side chat.
- The active route workspace.

| Route | Purpose |
| --- | --- |
| `/` | Workspace notes and editor |
| `/todo` | Tasks, due dates, descriptions, and subtasks |
| `/tables` | Structured tables and table pages |
| `/sources` | Source records and claims |
| `/verify` | Verification workflow |
| `/history` | Verification and fix history |
| `/connect` | Connector information |

## Authentication

Accounts are stored in SQLite. Passwords are hashed with Node.js `scrypt` and a random salt.

Successful sign-in creates a random session record and sets the `work_sync_session` cookie with `httpOnly`, `sameSite=lax`, a 30-day expiration, and `secure` in production.

Production browser API requests are authorized through that session. External API clients may use `KNOWLEDGE_API_KEY` in the `x-api-key` header.

## Storage boundaries

### Durable SQLite data

`src/lib/db/client.ts` creates and migrates:

- `users`
- `user_sessions`
- `workspace_notes`
- `sources`
- `claims`
- `verifications`
- `history_events`
- `fix_documents`
- `api_keys`
- `rate_limit_buckets`

Workspace notes and Sources include `user_id` ownership. Ownership checks prevent one logged-in user from loading another user's records.

### Device-local browser data

Tables, To Dos, saved macros, Main Macro selections, Workspace drafts, and editor metadata are currently stored in browser `localStorage`.

`src/lib/user-storage.ts` namespaces these keys as:

```text
<feature-key>:user:<user-id>
```

Signed-out data uses the `signed-out` namespace. On the first login, signed-out data can be transferred into that user's namespace. This prevents display across local accounts, but it does not synchronize browser data between devices.

### Agent conversation state

The Agent conversation is held in React state while the application remains mounted. Up to 40 validated messages are sent to the server for context. Closing or refreshing the browser can discard that conversation because it is not yet stored in SQLite.

## Agent request flow

1. The authenticated user enters a message in `AgentSideChat`.
2. The message appears immediately in the side panel.
3. The browser sends the current conversation to `POST /api/v1/agent/chat`.
4. The server validates the session, request size, and message roles.
5. The server calls the OpenAI Responses API using server-only `OPENAI_API_KEY` and `gpt-5-mini`.
6. The route streams text events back to the browser.
7. The side panel appends deltas to the visible Agent message.

The Agent has an empty tool list. It cannot execute macros, edit records, browse, or perform external actions.

## Macro architecture

Macro behavior is split across:

- `src/lib/ao-catalog.ts`
- `src/lib/ao-macro.ts`
- `src/components/AOMacroMenu.tsx`
- `src/components/MacroPanels.tsx`

Saved presets live in the user's browser namespace. Main Macro is limited to six entries. Compact and circular launchers dispatch internal browser events to the AO menu, which runs the selected preset against Workspace, Tables, or To Do.

## Security headers

`src/middleware.ts` applies:

- Content Security Policy
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- Disabled camera, microphone, and geolocation permissions
- `Cache-Control: no-store` for API routes

OpenAI traffic originates from the server, so the API key never enters browser code.

## Testing strategy

The Node test suite covers account validation, session authorization, per-user storage, table and To Do models, macro execution, text layout, and UI source contracts. Production validation should include type checking, all tests, an optimized build, and a browser smoke test.

# Architecture

## System overview

Work Sync is a single Next.js application with React client interfaces, Node.js route handlers, and an embedded SQLite database.

```text
Browser
  ├─ App shell, Workspace, To Do, Tables, Sources, Verify, History
  ├─ User-scoped localStorage cache for responsive editing
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

### Synchronized browser data

Tables, To Dos, saved macros, Main Macro selections, Workspace drafts, editor metadata, and Agent conversation history use browser `localStorage` as a responsive cache. For signed-in users, the durable copy is stored in the SQLite `user_state` record and synchronized through `/api/v1/user-state`.

`src/lib/user-storage.ts` namespaces these keys as:

```text
<feature-key>:user:<user-id>
```

Signed-out data uses the `signed-out` namespace. On login, signed-out data is transferred into that user's namespace and merged with existing remote state without replacing remote values. One-shot AO routing commands are intentionally excluded from synchronization so an action cannot replay on another device.

The server hydrates the cache before the signed-in interface is reloaded. Subsequent changes are uploaded after a short debounce. The current conflict policy is last writer wins, so simultaneous edits of the same feature on two devices are not merged field by field.

### Agent conversation state

The Agent conversation is held in React state while mounted and cached with the rest of the synchronized account state. Up to 40 validated messages are sent to the server for response context, while up to 80 completed messages are retained for reopening.

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

# Roadmap

This roadmap separates completed behavior from proposed work. Proposed items are not current functionality.

## Current baseline

- [x] Account creation, sign-in, sign-out, and production session authorization.
- [x] User-owned Workspace notes and Sources in SQLite.
- [x] Workspace line editor, cross-line selection, and formatting controls.
- [x] To Do descriptions, due dates, subtasks, one nested level, filters, scrolling, and drag ordering.
- [x] Tables, column configuration, select-option management, page cells, and table-page editing.
- [x] More than 50 macro presets, custom macros, text presets, Vault, and six Main Macro shortcuts.
- [x] Compact and circular Macro Panels, including `Ctrl+M`.
- [x] Streaming, text-only Agent side chat using a server-held API key and no tools.
- [x] Manual VPS deployment through systemd, Nginx, and Cloudflare.

## Priority 0: durable account data

- [ ] Move Tables from browser storage to user-owned SQLite records.
- [ ] Move To Dos and nested subtasks to user-owned SQLite records.
- [ ] Move Vault presets, custom macros, and Main Macro ordering to SQLite.
- [ ] Persist Agent conversations and allow users to reopen or delete them.
- [ ] Define versioned schema migrations instead of relying only on startup table checks.
- [ ] Add export and account-data deletion workflows.

This phase makes account data available across browsers and devices.

## Priority 1: reliability and collaboration

- [ ] Add full end-to-end browser tests for authentication, notes, To Do, Tables, macros, and Agent streaming.
- [ ] Add automated backup verification and a documented SQLite restore drill.
- [ ] Add durable comments, link sharing, and collaboration permissions.
- [ ] Add audit records for account and content changes.
- [ ] Add accessible keyboard navigation and focus management to all menus and modals.
- [ ] Add clear loading, retry, and offline states for server-backed features.

## Priority 2: delivery and operations

- [ ] Add a GitHub Actions deployment workflow that connects to the VPS over SSH.
- [ ] Require typecheck, tests, and production build before deployment.
- [ ] Add health checks and application readiness monitoring.
- [ ] Add structured server logs with secret redaction.
- [ ] Add alerts for repeated 5xx responses, failed deployments, and backup failures.
- [ ] Add a rollback procedure that preserves the database and restores a previous application revision.

## Priority 3: optional product expansion

- [ ] Add connector implementations after defining authentication and permission boundaries.
- [ ] Add macro import/export and shared preset libraries.
- [ ] Add server-managed table and Workspace templates.
- [ ] Add an approval-controlled Agent action layer only after tool permissions and audit requirements are specified.

Voice interaction is not part of the current Agent. It should not be reintroduced without a separate accepted specification.

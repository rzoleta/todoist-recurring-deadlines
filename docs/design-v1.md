# V1 Design

## Purpose

This project repairs Todoist deadlines for recurring tasks. Todoist advances recurring due dates when a task is completed, but deadlines currently remain fixed. V1 implements a deliberately naive, safe recurring-deadline repair flow for self-hosted users.

## Goals

- Provide a CLI-only first release.
- Support easy self-hosting through Bun source usage and Docker.
- Use Todoist's official TypeScript SDK where practical.
- Use Todoist Sync API polling as the default automation mechanism.
- Keep the deadline logic in framework-agnostic core modules.
- Support multiple future entrypoints, including cron, daemon, web app workers, and optional webhooks.
- Require only a Todoist API token for v1 self-hosted use.
- Use a fixed opt-in Todoist label named `recurring-deadline`.
- Repair date-only deadlines for simple daily, weekly, monthly, and yearly recurrences.

## Non-Goals

- No web UI in v1.
- No hosted multi-user OAuth flow in v1.
- No database in v1.
- No webhook-first automation in v1.
- No complex natural-language recurrence parsing in v1.
- No support for due datetimes or deadline datetimes in v1.
- No attempt to preserve historical due-to-deadline offsets beyond the current task fields.

## Runtime And Tooling

- Runtime: Bun.
- Package manager: Bun.
- Test runner: Bun test.
- Docker base image: official Bun image.
- V1 is source/Docker-first, not packaged as an installable npm-style CLI.

## Repository Shape

V1 should use a single TypeScript package with strict internal module boundaries.

```txt
src/core
  recurrence.ts
  eligibility.ts
  repair.ts
  types.ts

src/todoist
  client.ts
  sync.ts
  mapper.ts

src/config
  config.ts
  setup.ts

src/state
  file-state-store.ts
  lock-file.ts

src/cli
  index.ts
  commands.ts

src/worker
  poller.ts
  daemon.ts

docs
  design-v1.md
```

Boundary rules:

- `src/core` cannot import Todoist SDK, config, state, CLI, or worker modules.
- `src/todoist` adapts Todoist API/SDK responses into core types.
- `src/worker` orchestrates Todoist access, state, locking, and core repair logic.
- `src/cli` handles argument parsing, prompts, setup, and command dispatch.

## CLI

The project exposes one executable command:

```txt
todoist-recurring-deadlines
```

V1 subcommands:

```txt
todoist-recurring-deadlines setup
todoist-recurring-deadlines poll
todoist-recurring-deadlines daemon
todoist-recurring-deadlines reconcile
```

Command behavior:

- `setup`: prompt for or accept a Todoist API token, validate it, create the `recurring-deadline` label if missing, and write local config.
- `poll`: run one incremental Sync API polling cycle, using saved state.
- `daemon`: run `poll` every 5 minutes and run full reconciliation every 24 hours.
- `reconcile`: run one full repair scan with `sync_token=*`.

Bare command behavior:

- In an interactive TTY, prompt the user to run setup or choose one of `poll`, `daemon`, or `reconcile`.
- In a non-interactive local shell, print help and exit non-zero.
- In Docker, no command defaults to `daemon`.

CLI dependencies should stay minimal:

- Use custom argument parsing for v1.
- Use `@inquirer/prompts` for interactive setup and mode selection.

## Configuration

Local config and state are project-local by default:

```txt
.todoist-recurring-deadlines/
  config.json
  state.json
  poller.lock
```

Docker defaults:

```txt
/data/config.json
/data/state.json
/data/poller.lock
```

Path overrides:

```txt
TODOIST_CONFIG_PATH
TODOIST_STATE_PATH
TODOIST_LOCK_PATH
```

Config precedence:

```txt
env vars > saved config > defaults
```

Supported environment variables:

```txt
TODOIST_API_TOKEN
TODOIST_CONFIG_PATH
TODOIST_STATE_PATH
TODOIST_LOCK_PATH
TODOIST_POLL_INTERVAL_SECONDS
TODOIST_FULL_RECONCILE_INTERVAL_HOURS
```

Default values:

```txt
TODOIST_POLL_INTERVAL_SECONDS=300
TODOIST_FULL_RECONCILE_INTERVAL_HOURS=24
```

The opt-in label is fixed in v1:

```txt
recurring-deadline
```

Future versions may make the opt-in mode configurable, including an `all` mode.

## Setup

`setup` must validate the Todoist API token before saving config.

Setup flow:

```txt
prompt for or read token from --token
validate token with Todoist
fetch labels
create recurring-deadline label if missing
write config.json
chmod 600 config.json where supported
```

Non-interactive setup should support:

```txt
--token
--create-label
--yes
```

When `--token` is supplied, setup saves that token after validation. Users who prefer environment-based secrets can skip setup and provide `TODOIST_API_TOKEN` at runtime.

## State

State file shape:

```json
{
  "syncToken": "...",
  "lastSyncAt": "2026-05-05T12:00:00.000Z",
  "lastFullReconcileAt": "2026-05-05T00:00:00.000Z"
}
```

State writes must be atomic:

```txt
write temp file
fsync/close where practical
rename temp file into place
```

Manual `reconcile` updates `lastFullReconcileAt` after success, but does not replace the incremental `syncToken`.

Incremental sync-token recovery is the exception:

```txt
incremental sync fails due to invalid or expired syncToken
run full sync with sync_token=*
process active eligible tasks
save returned syncToken
continue normal polling
```

## Locking

V1 uses a local lock file to prevent concurrent poller runs.

Behavior:

```txt
if lock is missing: acquire and run
if lock exists and age <= 30 minutes: skip run
if lock exists and age > 30 minutes: replace lock and run
```

Cron mode should exit successfully when another run is active. Daemon mode should skip the tick.

## Polling Model

Polling is the default v1 automation mechanism.

Normal poll:

```txt
load config
load state
acquire lock
call Todoist Sync API with saved syncToken
process changed active tasks
save returned syncToken after successful processing
release lock
```

Full reconciliation:

```txt
call Todoist Sync API with sync_token=*
process all active eligible tasks
update lastFullReconcileAt after success
do not replace normal syncToken
```

Scheduling:

- Incremental poll every 5 minutes by default.
- Full reconciliation every 24 hours by default.
- `poll` should also run full reconciliation when 24 hours have elapsed.
- `daemon` repeatedly runs the same polling logic.

## Todoist Adapter

Use the official Todoist TypeScript SDK where it supports the needed operation.

Use direct HTTP calls only for Sync API behavior if the SDK does not expose the required sync-token workflow cleanly. Direct Sync API usage must stay isolated in `src/todoist/sync.ts`.

The core module should depend on normalized task types, not SDK response types.

## Eligibility

V1 processes only tasks that meet all of these criteria:

- Task is active.
- Task has label `recurring-deadline`.
- Task has a due date.
- Due date is recurring.
- Due date is date-only.
- Task has a deadline.
- Deadline is date-only.
- Due recurrence is one of the supported simple intervals.

Unsupported tasks are no-ops with clear log reasons.

## Supported Recurrence

Supported v1 recurrence strings:

```txt
daily
weekly
monthly
yearly
annually
```

Unsupported examples:

```txt
every weekday
every 3 days
every other week
every first Monday
every last day
every workday
custom natural-language recurrence
```

Unsupported recurrence should not fail the poll. It should log a no-op reason and leave the task unchanged.

## Deadline Repair Algorithm

V1 uses the current due recurrence as the source of truth.

Rule:

```txt
if deadline < due:
  advance deadline by the due recurrence interval until deadline >= due
else:
  no-op
```

Deadline equal to due date is valid.

Webhook, poll, daemon, and reconciliation entrypoints should all use this same repair rule.

The algorithm advances the existing deadline. It does not attempt to reconstruct or preserve the original due-to-deadline offset from history.

Example:

```txt
due:      2026-06-01
deadline: 2026-05-15
monthly recurrence

result:   2026-06-15
```

Repeated advancement handles long-stale tasks:

```txt
due:      2026-08-01
deadline: 2026-05-15
monthly recurrence

result:   2026-08-15
```

Use a safety cap, such as 500 iterations, to prevent infinite loops.

## Date Math

V1 supports date-only values.

Unsupported:

```txt
due.datetime
deadline.datetime
```

Monthly and yearly date overflow should clamp to the last valid day of the target month.

Examples:

```txt
monthly: 2026-01-31 -> 2026-02-28
monthly: 2028-01-31 -> 2028-02-29
yearly:  2028-02-29 -> 2029-02-28
```

## Docker

Docker is included in v1.

Default container command:

```txt
todoist-recurring-deadlines daemon
```

Recommended Docker usage prefers environment variables for secrets:

```sh
docker run \
  -e TODOIST_API_TOKEN=... \
  -v todoist-recurring-deadlines:/data \
  todoist-recurring-deadlines
```

Saved config is also supported:

```sh
docker run -it \
  -v todoist-recurring-deadlines:/data \
  todoist-recurring-deadlines setup

docker run \
  -v todoist-recurring-deadlines:/data \
  todoist-recurring-deadlines
```

## README Role

`README.md` is for end users. It should focus on:

- What the tool does.
- Quick start.
- Docker usage.
- Bun/source usage.
- CLI commands.
- The `recurring-deadline` label.
- Troubleshooting.

Design rationale belongs in this document, not in the README.

## Future Extensions

Future versions may add:

- Hosted web app.
- Todoist OAuth.
- Multi-user account storage.
- Configurable opt-in modes, including `label` and `all`.
- Optional webhook adapter.
- Database-backed state.
- More recurrence parsing.
- Datetime support.
- Installable package distribution.

# Todoist Recurring Deadlines

Repair Todoist deadlines for recurring tasks.

Todoist can advance a recurring due date when a task is completed, but deadlines do not currently recur with it. This tool polls Todoist and advances stale deadlines for opted-in recurring tasks.

V1 is CLI-only and self-hosted.

## Status

Early design/implementation stage.

## How It Works

Add the `recurring-deadline` label to any recurring task that has a deadline. When the task's deadline falls behind its current due date, this tool advances the deadline using the task's current recurrence.

Supported recurrence intervals in v1:

- daily
- weekly
- monthly
- yearly

Date-only tasks are supported. Tasks with due times or deadline times are ignored in v1.

## Commands

```sh
todoist-recurring-deadlines setup
todoist-recurring-deadlines poll
todoist-recurring-deadlines daemon
todoist-recurring-deadlines reconcile
```

- `setup`: save and validate your Todoist API token, then create the `recurring-deadline` label if needed.
- `poll`: run one incremental sync cycle.
- `daemon`: keep running and poll every 5 minutes.
- `reconcile`: run a full repair scan.

## Configuration

Local config and state are stored in:

```txt
.todoist-recurring-deadlines/
```

Add this directory to `.gitignore` because it can contain your Todoist API token.

You can also provide the token with an environment variable:

```sh
TODOIST_API_TOKEN=...
```

Environment variables override saved config.

## Design

See `docs/design-v1.md` for the v1 architecture and implementation decisions.

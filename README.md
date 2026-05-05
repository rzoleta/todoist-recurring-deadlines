# Todoist Recurring Deadlines

Todoist can repeat due dates, but deadlines do not repeat yet.

Example:

- You have a monthly task due on May 1.
- The task has a deadline on May 15.
- When you complete the task, Todoist moves the due date to June 1.
- The deadline stays on May 15.

This tool fixes that by moving the deadline forward too. In the example above, it changes the deadline to June 15.

## Who This Is For

Use this if you:

- use Todoist recurring tasks
- use Todoist deadlines
- want those deadlines to move forward automatically
- are comfortable running a small helper program yourself

This is currently a self-hosted command-line tool. There is no web app yet.

## How It Works

The tool checks your Todoist account every few minutes. When it finds an opted-in task whose deadline is behind its due date, it moves the deadline forward.

Only tasks with this label are touched:

```txt
recurring-deadline
```

This is intentional. You choose exactly which tasks the tool is allowed to manage.

V1 supports simple date-only recurring tasks:

- daily
- weekly
- monthly
- yearly

V1 ignores tasks with times, such as “due at 9am”.

## What Gets Changed

The tool only updates the task deadline.

It does not change:

- task content
- due dates
- projects
- sections
- comments
- reminders
- tasks without the `recurring-deadline` label

## Install

This project uses [Bun](https://bun.sh/).

From this folder, install dependencies:

```sh
bun install
```

## Set Up Todoist

Run setup:

```sh
bun run start setup
```

You will be asked for your Todoist API token.

You can find it in Todoist:

```txt
Settings -> Integrations -> Developer -> API token
```

Setup will:

- check that your token works
- save it locally
- create the `recurring-deadline` label if it does not already exist

Your local settings are saved in:

```txt
.todoist-recurring-deadlines/
```

Do not commit this folder. It can contain your Todoist API token.

## Choose Tasks To Manage

In Todoist, add the label to any task you want managed:

```txt
recurring-deadline
```

The task should also have:

- a recurring due date
- a deadline
- no due time or deadline time

## Run Once

To check Todoist one time:

```sh
bun run start poll
```

To force a full check of all tasks and refresh local sync state:

```sh
bun run start poll --full
```

## Run Continuously

To keep the tool running in the background:

```sh
bun run start daemon
```

This checks Todoist every 5 minutes.

## Repair Scan

If you think something was missed, run a full repair scan:

```sh
bun run start reconcile
```

This checks active tasks with the `recurring-deadline` label and repairs stale deadlines.

## Docker

Build the image:

```sh
docker build -t todoist-recurring-deadlines .
```

Run it:

```sh
docker run \
  -e TODOIST_API_TOKEN=your_todoist_api_token \
  -v todoist-recurring-deadlines:/data \
  todoist-recurring-deadlines
```

The Docker container runs continuously by default.

The `/data` volume stores local sync state so the tool does not need to start from scratch every time the container restarts.

## Railway

Deploy this repo as a Docker service.

Required Railway settings:

- Add `TODOIST_API_TOKEN` as an environment variable.
- Add a persistent volume mounted at `/data`.

The included Dockerfile already runs the tool in continuous mode.

## Commands

```sh
bun run start setup
bun run start poll
bun run start poll --full
bun run start daemon
bun run start reconcile
```

Command summary:

- `setup`: save and validate your Todoist token
- `poll`: check Todoist once
- `poll --full`: check all synced Todoist tasks and refresh local sync state
- `daemon`: keep checking every 5 minutes
- `reconcile`: run a full repair scan for labelled active tasks

## Tests

Run all tests:

```sh
bun test
```

Some tests create, update, and delete real Todoist tasks. They use your saved Todoist token. If no token is configured, those tests fail.

To run only the Todoist integration tests:

```sh
bun test tests/integration/todoist.integration.test.ts
```

## VS Code / Cursor Debugging

This repo includes debug profiles in `.vscode/launch.json`.

Open the Run and Debug panel and choose one of:

- `Debug CLI: poll`
- `Debug CLI: poll --full`
- `Debug CLI: reconcile`
- `Debug CLI: daemon`
- `Debug CLI: setup`
- `Debug Current Bun Test File`

## Design Notes

For implementation details and architecture decisions, see:

```txt
docs/design-v1.md
```

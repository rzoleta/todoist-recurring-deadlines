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

When you run the tool, it scans your opted-in Todoist tasks. For any task whose deadline is behind its due date, it moves the deadline forward.

Only tasks with this label are touched:

```txt
recurring-deadline
```

This is intentional. You choose exactly which tasks the tool is allowed to manage.

Supported recurrences (date-only):

- daily
- weekly
- monthly
- yearly

Tasks with times (such as "due at 9am") are ignored.

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

1. Find your Todoist API token at: `Settings -> Integrations -> Developer -> API token`.
2. Put it in a `.env` file at the project root:

   ```txt
   TODOIST_API_TOKEN=your_todoist_api_token
   ```

3. In Todoist, create a label named `recurring-deadline` and add it to any task you want managed. Tasks also need a recurring due date, a deadline, and no due/deadline times.

## Run

```sh
bun run start
```

This is a one-shot run. It checks active labelled tasks, repairs stale deadlines, and exits. Schedule it with cron, launchd, or any other scheduler if you want it to run regularly.

## Docker

Build the image:

```sh
docker build -t todoist-recurring-deadlines .
```

Run it:

```sh
docker run \
  -e TODOIST_API_TOKEN=your_todoist_api_token \
  todoist-recurring-deadlines
```

The container runs once and exits.

## Tests

Run all tests:

```sh
bun test
```

The integration test creates, updates, and deletes real Todoist tasks. It uses `TODOIST_API_TOKEN` from your environment. If the token is missing, the integration test fails.

To run only the Todoist integration tests:

```sh
bun test tests/integration/todoist.integration.test.ts
```

## VS Code / Cursor Debugging

This repo includes a debug profile in `.vscode/launch.json`:

- `Debug CLI: reconcile`
- `Debug Current Bun Test File`

import { input, select } from "@inquirer/prompts";
import { loadConfig, type AppConfig } from "../config/config";
import { runSetup } from "../config/setup";
import { fileStateStore } from "../state/file-state-store";
import { SdkTodoistClient } from "../todoist/client";
import { runDaemon } from "../worker/daemon";
import { runFullReconcile, runPoll, type RunSummary } from "../worker/poller";
import { stringFlag, type ParsedArgs } from "./args";

export async function runCommand(parsed: ParsedArgs): Promise<void> {
  switch (parsed.command) {
    case "setup":
      return await setupCommand(parsed);
    case "poll":
      return await pollCommand(parsed);
    case "daemon":
      return await daemonCommand();
    case "reconcile":
      return await reconcileCommand();
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return;
    case undefined:
      return await interactiveCommand();
    default:
      throw new Error(`Unknown command: ${parsed.command}`);
  }
}

async function setupCommand(parsed: ParsedArgs): Promise<void> {
  const token = stringFlag(parsed.flags, "token") ?? (await input({ message: "Todoist API token" }));
  const client = new SdkTodoistClient(token);
  await runSetup({ token }, client);
  console.log("Setup complete. The recurring-deadline label is ready.");
}

async function pollCommand(parsed: ParsedArgs): Promise<void> {
  const config = await loadConfig();
  const summary = await runPoll(storeFor(config), new SdkTodoistClient(config.todoistApiToken), {
    forceFullSync: parsed.flags.full === true,
    fullReconcileIntervalHours: config.fullReconcileIntervalHours,
    optInLabel: config.optInLabel,
    onSkip: async ({ taskId, reason }) => {
      console.log(`  skip task=${taskId} reason="${reason}"`);
    },
  });
  printSummary("Poll complete", summary);
}

async function daemonCommand(): Promise<void> {
  const config = await loadConfig();
  await runDaemon(storeFor(config), new SdkTodoistClient(config.todoistApiToken), {
    pollIntervalSeconds: config.pollIntervalSeconds,
    fullReconcileIntervalHours: config.fullReconcileIntervalHours,
    optInLabel: config.optInLabel,
  });
}

async function reconcileCommand(): Promise<void> {
  const config = await loadConfig();
  const summary = await runFullReconcile(storeFor(config), new SdkTodoistClient(config.todoistApiToken), {
    optInLabel: config.optInLabel,
    onSkip: async ({ taskId, reason }) => {
      console.log(`  skip task=${taskId} reason="${reason}"`);
    },
  });
  printSummary("Reconcile complete", summary);
}

async function interactiveCommand(): Promise<void> {
  if (!process.stdin.isTTY) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const command = await select({
    message: "What do you want to run?",
    choices: [
      { name: "setup - Configure Todoist token and label", value: "setup" },
      { name: "poll - Run one sync cycle", value: "poll" },
      { name: "daemon - Keep polling", value: "daemon" },
      { name: "reconcile - Run full repair scan", value: "reconcile" },
    ],
  });

  await runCommand({ command, flags: {} });
}

function storeFor(config: AppConfig) {
  return fileStateStore({ statePath: config.statePath, lockPath: config.lockPath });
}

function printSummary(prefix: string, summary: RunSummary): void {
  console.log(`${prefix}: scanned=${summary.scanned} updated=${summary.updated} skipped=${summary.skipped}`);
}

export function printHelp(): void {
  console.log(`Usage: todoist-recurring-deadlines <command>

Commands:
  setup      Validate and save Todoist API token
  poll       Run one incremental sync cycle (--full to refresh sync token)
  daemon     Poll every 5 minutes
  reconcile  Run one full repair scan
`);
}

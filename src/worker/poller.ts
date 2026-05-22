import { repairDeadline } from "../core/repair";
import { mapTask } from "../todoist/mapper";
import { InvalidSyncTokenError } from "../todoist/sync";
import { shouldRunFullReconcile } from "../state/file-state-store";
import type { AppState, StateStore } from "../state/state-store";
import type { CoreTask } from "../core/types";
import type { TodoistClient } from "../todoist/client";

export interface RunSummary {
  scanned: number;
  updated: number;
  skipped: number;
}

export interface RepairEvent {
  taskId: string;
  previousDeadline: string;
  deadline: string;
}

export interface SkipEvent {
  taskId: string;
  reason: string;
}

export type RepairListener = (event: RepairEvent) => Promise<void>;
export type SkipListener = (event: SkipEvent) => Promise<void>;

export interface PollOptions {
  forceFullSync?: boolean;
  fullReconcileIntervalHours: number;
  optInLabel: string;
  onRepair?: RepairListener;
  onSkip?: SkipListener;
}

export interface ReconcileOptions {
  optInLabel: string;
  onRepair?: RepairListener;
  onSkip?: SkipListener;
}

const ZERO_SUMMARY: RunSummary = { scanned: 0, updated: 0, skipped: 0 };

export async function runPoll(
  store: StateStore,
  client: TodoistClient,
  options: PollOptions,
): Promise<RunSummary> {
  const result = await store.withLock(async () => {
    let state = await store.load();
    const syncToken = options.forceFullSync ? "*" : (state.syncToken ?? "*");

    try {
      const response = await client.syncItems(syncToken);
      const summary = await processTasks(response.items.map(mapTask), client, options.onRepair, options.onSkip);
      state = { ...state, syncToken: response.syncToken, lastSyncAt: new Date().toISOString() };

      if (!options.forceFullSync && shouldRunFullReconcile(state, options.fullReconcileIntervalHours)) {
        const fullSummary = await runFullReconcileWithoutLock(store, client, state, options);
        return combineSummaries(summary, fullSummary);
      }

      await store.save(state);
      return summary;
    } catch (error) {
      if (!(error instanceof InvalidSyncTokenError)) throw error;

      const response = await client.syncItems("*");
      const summary = await processTasks(response.items.map(mapTask), client, options.onRepair, options.onSkip);
      await store.save({
        ...state,
        syncToken: response.syncToken,
        lastSyncAt: new Date().toISOString(),
      });
      return summary;
    }
  });

  return result ?? ZERO_SUMMARY;
}

export async function runFullReconcile(
  store: StateStore,
  client: TodoistClient,
  options: ReconcileOptions,
): Promise<RunSummary> {
  const result = await store.withLock(async () => {
    const state = await store.load();
    return await runFullReconcileWithoutLock(store, client, state, options);
  });

  return result ?? ZERO_SUMMARY;
}

async function runFullReconcileWithoutLock(
  store: StateStore,
  client: TodoistClient,
  state: AppState,
  options: ReconcileOptions,
): Promise<RunSummary> {
  const tasks = await client.getActiveTasksByLabel(options.optInLabel);
  const summary = await processTasks(tasks, client, options.onRepair, options.onSkip);
  await store.save({ ...state, lastFullReconcileAt: new Date().toISOString() });
  return summary;
}

async function processTasks(
  tasks: CoreTask[],
  client: TodoistClient,
  onRepair: RepairListener | undefined,
  onSkip: SkipListener | undefined,
): Promise<RunSummary> {
  const summary: RunSummary = { scanned: 0, updated: 0, skipped: 0 };

  for (const task of tasks) {
    summary.scanned += 1;
    const result = repairDeadline(task);

    if (result.action === "update") {
      await client.updateDeadline(result.taskId, result.deadline);
      if (onRepair) {
        await onRepair({
          taskId: result.taskId,
          previousDeadline: result.previousDeadline,
          deadline: result.deadline,
        });
      }
      summary.updated += 1;
    } else {
      if (onSkip) {
        await onSkip({ taskId: task.id, reason: result.reason });
      }
      summary.skipped += 1;
    }
  }

  return summary;
}

function combineSummaries(left: RunSummary, right: RunSummary): RunSummary {
  return {
    scanned: left.scanned + right.scanned,
    updated: left.updated + right.updated,
    skipped: left.skipped + right.skipped,
  };
}

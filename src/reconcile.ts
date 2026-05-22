import { repairDeadline } from "./core/repair";
import { OPT_IN_LABEL } from "./core/types";
import type { TodoistClient } from "./todoist/client";

export interface ReconcileSummary {
  scanned: number;
  updated: number;
  skipped: number;
}

export async function runReconcile(client: TodoistClient): Promise<ReconcileSummary> {
  const tasks = await client.getActiveTasksByLabel(OPT_IN_LABEL);
  const summary: ReconcileSummary = { scanned: 0, updated: 0, skipped: 0 };

  for (const task of tasks) {
    summary.scanned += 1;
    const result = repairDeadline(task);

    if (result.action === "update") {
      await client.updateDeadline(result.taskId, result.deadline);
      summary.updated += 1;
    } else {
      console.log(`  skip task=${task.id} content=${task.content} reason="${result.reason}"`);
      summary.skipped += 1;
    }
  }

  return summary;
}

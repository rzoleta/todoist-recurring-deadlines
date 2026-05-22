import { TodoistApi, type Task } from "@doist/todoist-api-typescript";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { OPT_IN_LABEL } from "../../src/core/types";
import { runReconcile } from "../../src/reconcile";
import { TodoistClient } from "../../src/todoist/client";

const createdTaskIds: string[] = [];

let api: TodoistApi;
let client: TodoistClient;

describe("Todoist integration", () => {
  beforeAll(async () => {
    const token = process.env.TODOIST_API_TOKEN;
    if (!token) throw new Error("TODOIST_API_TOKEN is required for integration tests");
    api = new TodoistApi(token);
    client = new TodoistClient(token);
    await ensureOptInLabel(api);
  });

  afterEach(async () => {
    while (createdTaskIds.length > 0) {
      const taskId = createdTaskIds.pop()!;
      try {
        await api.deleteTask(taskId);
      } catch {
        // Best effort cleanup. Recurring completion keeps the task active in normal cases.
      }
    }
  });

  test("reconcile repairs an active labelled stale recurring task", async () => {
    const staleTask = await createStaleRecurringTask();
    const staleDates = taskDates(staleTask);
    expect(staleDates.deadline < staleDates.due).toBe(true);

    const summary = await runReconcile(client);
    const repairedTask = await api.getTask(staleTask.id);
    const repairedDates = taskDates(repairedTask);

    expect(summary.updated).toBeGreaterThan(0);
    expect(repairedDates.deadline >= repairedDates.due).toBe(true);
  }, 30_000);
});

async function ensureOptInLabel(api: TodoistApi): Promise<void> {
  const labels = await api.getLabels();
  if (labels.results.some((label) => label.name === OPT_IN_LABEL)) return;
  await api.addLabel({ name: OPT_IN_LABEL });
}

async function createStaleRecurringTask(): Promise<Task> {
  const task = await api.addTask({
    content: `[todoist-recurring-deadlines integration] ${crypto.randomUUID()}`,
    labels: [OPT_IN_LABEL],
    dueString: "every month",
  });
  createdTaskIds.push(task.id);

  if (!task.due) throw new Error(`Test task ${task.id} is missing due date after creation`);
  const staleDeadline = addMonthsClamped(task.due.date, -1);
  return await api.updateTask(task.id, { deadlineDate: staleDeadline });
}

function taskDates(task: Task): { due: string; deadline: string } {
  if (!task.due) throw new Error(`Task ${task.id} is missing due date`);
  if (!task.deadline) throw new Error(`Task ${task.id} is missing deadline`);
  return { due: task.due.date, deadline: task.deadline.date };
}

function addMonthsClamped(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

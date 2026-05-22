import type { Task } from "@doist/todoist-api-typescript";
import type { CoreTask } from "../core/types";

export function mapTask(task: Task): CoreTask {
  return {
    id: task.id,
    labels: task.labels,
    due: task.due
      ? {
          date: task.due.date,
          datetime: task.due.datetime,
          isRecurring: task.due.isRecurring,
          string: task.due.string,
        }
      : null,
    deadline: task.deadline ? { date: task.deadline.date } : null,
    checked: task.checked,
    isDeleted: task.isDeleted,
  };
}

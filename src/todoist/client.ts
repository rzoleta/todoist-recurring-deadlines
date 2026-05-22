import { TodoistApi, type Task } from "@doist/todoist-api-typescript";
import { mapTask } from "./mapper";
import type { CoreTask } from "../core/types";

export class TodoistClient {
  private readonly api: TodoistApi;

  constructor(apiToken: string) {
    this.api = new TodoistApi(apiToken);
  }

  async updateDeadline(taskId: string, deadline: string): Promise<void> {
    await this.api.updateTask(taskId, { deadlineDate: deadline });
  }

  async getActiveTasksByLabel(label: string): Promise<CoreTask[]> {
    const tasks: Task[] = [];
    let cursor: string | null | undefined;

    do {
      const response = await this.api.getTasks({ label, cursor, limit: 200 });
      tasks.push(...response.results);
      cursor = response.nextCursor;
    } while (cursor);

    return tasks.map(mapTask);
  }
}

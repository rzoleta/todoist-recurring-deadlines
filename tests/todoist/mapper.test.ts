import { describe, expect, test } from "bun:test";
import { mapTask } from "../../src/todoist/mapper";

describe("mapTask", () => {
  test("maps SDK recurring task fields", () => {
    const task = mapTask({
      id: "task-1",
      labels: ["recurring-deadline"],
      due: {
        date: "2026-05-05",
        string: "every month",
        isRecurring: true,
      },
      deadline: { date: "2026-04-05" },
      checked: false,
      isDeleted: false,
    } as never);

    expect(task.due?.isRecurring).toBe(true);
    expect(task.isDeleted).toBe(false);
    expect(task.deadline?.date).toBe("2026-04-05");
  });
});

export const OPT_IN_LABEL = "recurring-deadline";

export type RecurrenceInterval = "daily" | "weekly" | "monthly" | "yearly";

export interface CoreDueDate {
  date: string;
  datetime?: string | null;
  isRecurring: boolean;
  string: string;
}

export interface CoreDeadline {
  date: string;
}

export interface CoreTask {
  id: string;
  labels: string[];
  due: CoreDueDate | null;
  deadline: CoreDeadline | null;
  isDeleted?: boolean;
  checked?: boolean;
  content: string;
}

export type EligibilityResult =
  | { eligible: true; interval: RecurrenceInterval }
  | { eligible: false; reason: string };

export type RepairResult =
  | { action: "update"; taskId: string; deadline: string; previousDeadline: string }
  | { action: "noop"; reason: string };

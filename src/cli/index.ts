#!/usr/bin/env bun
import { runReconcile } from "../reconcile";
import { TodoistClient } from "../todoist/client";

const token = process.env.TODOIST_API_TOKEN;
if (!token) {
  console.error("Missing TODOIST_API_TOKEN environment variable.");
  process.exit(1);
}

try {
  const summary = await runReconcile(new TodoistClient(token));
  console.log(`Reconcile complete: scanned=${summary.scanned} updated=${summary.updated} skipped=${summary.skipped}`);
} catch (error) {
  console.error(error);
  process.exit(1);
}

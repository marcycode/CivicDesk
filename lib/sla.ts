import type { Priority, WorkOrder } from "@/lib/types";

const hoursByPriority: Record<Priority, number> = {
  Low: 24 * 7,
  Medium: 72,
  High: 24,
  Urgent: 4
};

export function getSlaHours(priority: Priority) {
  return hoursByPriority[priority];
}

export function getElapsedHours(fromIso: string, toIso = new Date().toISOString()) {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return ms / (1000 * 60 * 60);
}

export function isClosedStatus(status: WorkOrder["status"]) {
  return status === "Resolved" || status === "Closed";
}

export function isOverdue(workOrder: WorkOrder, nowIso = new Date().toISOString()) {
  if (isClosedStatus(workOrder.status)) {
    return false;
  }

  return getElapsedHours(workOrder.createdAt, nowIso) > getSlaHours(workOrder.priority);
}

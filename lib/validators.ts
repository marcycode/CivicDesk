import { categories, priorities, statuses, type Category, type Priority, type Status, type WorkOrderFilters } from "@/lib/types";

export function asStatus(value: string | undefined): Status | undefined {
  return value && statuses.includes(value as Status) ? (value as Status) : undefined;
}

export function asPriority(value: string | undefined): Priority | undefined {
  return value && priorities.includes(value as Priority) ? (value as Priority) : undefined;
}

export function asCategory(value: string | undefined): Category | undefined {
  return value && categories.includes(value as Category) ? (value as Category) : undefined;
}

export function toWorkOrderFilters(input: {
  status?: string;
  priority?: string;
  facilityId?: string;
  category?: string;
  assigneeId?: string;
}): WorkOrderFilters {
  return {
    status: asStatus(input.status),
    priority: asPriority(input.priority),
    facilityId: input.facilityId || undefined,
    category: asCategory(input.category),
    assigneeId: input.assigneeId || undefined
  };
}

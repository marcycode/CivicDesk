import { categories, priorities, type Category, type Metrics, type Technician, type WorkOrder } from "@/lib/types";
import { getElapsedHours, isClosedStatus, isOverdue } from "@/lib/sla";

export function calculateMetrics(workOrders: WorkOrder[], technicians: Technician[]): Metrics {
  const resolved = workOrders.filter((order) => Boolean(order.resolvedAt));
  const open = workOrders.filter((order) => !isClosedStatus(order.status));

  const meanTimeToResolutionHours =
    resolved.length === 0
      ? null
      : roundToOneDecimal(
          resolved.reduce((sum, order) => sum + getElapsedHours(order.createdAt, order.resolvedAt ?? order.updatedAt), 0) /
            resolved.length
        );

  const meanTimeToResolutionByCategory = Object.fromEntries(
    categories
      .map((category) => {
        const inCategory = resolved.filter((order) => order.category === category);
        if (inCategory.length === 0) {
          return [category, undefined];
        }

        const hours =
          inCategory.reduce(
            (sum, order) => sum + getElapsedHours(order.createdAt, order.resolvedAt ?? order.updatedAt),
            0
          ) / inCategory.length;

        return [category, roundToOneDecimal(hours)];
      })
      .filter((entry) => entry[1] !== undefined)
  ) as Partial<Record<Category, number>>;

  const openBacklogByCategory = Object.fromEntries(
    categories
      .map((category) => [category, open.filter((order) => order.category === category).length] as const)
      .filter((entry) => entry[1] > 0)
  ) as Partial<Record<Category, number>>;

  const openBacklogByPriority = Object.fromEntries(
    priorities
      .map((priority) => [priority, open.filter((order) => order.priority === priority).length] as const)
      .filter((entry) => entry[1] > 0)
  ) as Metrics["openBacklogByPriority"];

  const overdueCount = open.filter((order) => isOverdue(order)).length;

  const technicianLoad = technicians
    .map((technician) => ({
      technicianId: technician.id,
      technicianName: technician.name,
      openCount: open.filter((order) => order.assigneeId === technician.id).length
    }))
    .sort((a, b) => b.openCount - a.openCount || a.technicianName.localeCompare(b.technicianName));

  return {
    meanTimeToResolutionHours,
    meanTimeToResolutionByCategory,
    openBacklogByCategory,
    openBacklogByPriority,
    overdueCount,
    technicianLoad
  };
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

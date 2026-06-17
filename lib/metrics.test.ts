import { describe, expect, it } from "vitest";
import type { Technician, WorkOrder } from "@/lib/types";
import { calculateMetrics } from "@/lib/metrics";

const technicians: Technician[] = [
  { id: "tech-1", name: "Maya Chen", trade: "HVAC" },
  { id: "tech-2", name: "Andre Bouchard", trade: "Electrical" },
  { id: "tech-3", name: "Leila Singh", trade: "Plumbing" }
];

function makeOrder(overrides: Partial<WorkOrder> & Pick<WorkOrder, "id">): WorkOrder {
  return {
    title: "t",
    description: "d",
    facilityId: "fac-1",
    category: "HVAC",
    priority: "Medium",
    status: "Open",
    assigneeId: null,
    requesterName: "Tester",
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
    resolvedAt: null,
    activity: [],
    comments: [],
    ...overrides
  } as WorkOrder;
}

describe("calculateMetrics", () => {
  it("returns null MTTR and empty maps for an empty dataset", () => {
    const metrics = calculateMetrics([], technicians);
    expect(metrics.meanTimeToResolutionHours).toBeNull();
    expect(metrics.meanTimeToResolutionByCategory).toEqual({});
    expect(metrics.openBacklogByCategory).toEqual({});
    expect(metrics.openBacklogByPriority).toEqual({});
    expect(metrics.overdueCount).toBe(0);
    expect(metrics.technicianLoad.every((load) => load.openCount === 0)).toBe(true);
  });

  it("matches the seeded dataset shape: MTTR, backlog by category/priority, technician load", () => {
    const orders: WorkOrder[] = [
      makeOrder({
        id: "wo-1001",
        category: "HVAC",
        priority: "High",
        status: "Assigned",
        assigneeId: "tech-1"
      }),
      makeOrder({
        id: "wo-1002",
        category: "Structural",
        priority: "Urgent",
        status: "In Progress",
        assigneeId: "tech-2"
      }),
      makeOrder({
        id: "wo-1003",
        category: "Plumbing",
        priority: "Medium",
        status: "Resolved",
        assigneeId: "tech-3",
        createdAt: "2026-06-10T09:00:00.000Z",
        resolvedAt: "2026-06-11T17:30:00.000Z"
      })
    ];

    const metrics = calculateMetrics(orders, technicians);

    expect(metrics.meanTimeToResolutionHours).toBe(32.5);
    expect(metrics.meanTimeToResolutionByCategory).toEqual({ Plumbing: 32.5 });
    expect(metrics.openBacklogByCategory).toEqual({ HVAC: 1, Structural: 1 });
    expect(metrics.openBacklogByPriority).toEqual({ High: 1, Urgent: 1 });
    expect(metrics.technicianLoad).toEqual([
      { technicianId: "tech-2", technicianName: "Andre Bouchard", openCount: 1 },
      { technicianId: "tech-1", technicianName: "Maya Chen", openCount: 1 },
      { technicianId: "tech-3", technicianName: "Leila Singh", openCount: 0 }
    ]);
  });

  it("sorts technician load by openCount desc then name asc", () => {
    const orders: WorkOrder[] = [
      makeOrder({ id: "a", status: "Open", assigneeId: "tech-2" }),
      makeOrder({ id: "b", status: "Open", assigneeId: "tech-2" }),
      makeOrder({ id: "c", status: "Open", assigneeId: "tech-1" })
    ];

    const metrics = calculateMetrics(orders, technicians);
    expect(metrics.technicianLoad.map((load) => load.technicianName)).toEqual([
      "Andre Bouchard",
      "Maya Chen",
      "Leila Singh"
    ]);
  });
});

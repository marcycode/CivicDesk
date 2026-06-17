import { describe, expect, it } from "vitest";
import type { WorkOrder } from "@/lib/types";
import { getSlaHours, isClosedStatus, isOverdue } from "@/lib/sla";

function makeOrder(overrides: Partial<WorkOrder>): WorkOrder {
  return {
    id: "wo-test",
    title: "test",
    description: "test description",
    facilityId: "fac-1",
    category: "HVAC",
    priority: "Medium",
    status: "Open",
    assigneeId: null,
    requesterName: "Tester",
    createdAt: "2026-06-17T00:00:00.000Z",
    updatedAt: "2026-06-17T00:00:00.000Z",
    resolvedAt: null,
    activity: [],
    comments: [],
    ...overrides
  };
}

describe("getSlaHours", () => {
  it("returns the canonical SLA hours per priority", () => {
    expect(getSlaHours("Urgent")).toBe(4);
    expect(getSlaHours("High")).toBe(24);
    expect(getSlaHours("Medium")).toBe(72);
    expect(getSlaHours("Low")).toBe(168);
  });
});

describe("isClosedStatus", () => {
  it("treats Resolved and Closed as closed", () => {
    expect(isClosedStatus("Resolved")).toBe(true);
    expect(isClosedStatus("Closed")).toBe(true);
  });

  it("treats Open / Assigned / In Progress as not closed", () => {
    expect(isClosedStatus("Open")).toBe(false);
    expect(isClosedStatus("Assigned")).toBe(false);
    expect(isClosedStatus("In Progress")).toBe(false);
  });
});

describe("isOverdue", () => {
  const now = "2026-06-17T12:00:00.000Z";

  it("flags an Urgent order opened 5 hours ago as overdue (SLA 4h)", () => {
    const order = makeOrder({
      priority: "Urgent",
      status: "Assigned",
      createdAt: "2026-06-17T07:00:00.000Z"
    });
    expect(isOverdue(order, now)).toBe(true);
  });

  it("does NOT flag an Urgent order opened 1 hour ago as overdue", () => {
    const order = makeOrder({
      priority: "Urgent",
      status: "Open",
      createdAt: "2026-06-17T11:00:00.000Z"
    });
    expect(isOverdue(order, now)).toBe(false);
  });

  it("never flags a Resolved order as overdue, even if past SLA", () => {
    const order = makeOrder({
      priority: "Urgent",
      status: "Resolved",
      createdAt: "2026-06-10T00:00:00.000Z",
      resolvedAt: "2026-06-11T00:00:00.000Z"
    });
    expect(isOverdue(order, now)).toBe(false);
  });
});

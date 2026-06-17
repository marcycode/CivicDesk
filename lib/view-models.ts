import { isOverdue } from "@/lib/sla";
import type { Facility, Technician, WorkOrder } from "@/lib/types";

export type DecoratedWorkOrder = WorkOrder & {
  facilityName: string;
  assigneeName: string | null;
  overdue: boolean;
};

export function decorateWorkOrders(workOrders: WorkOrder[], facilities: Facility[], technicians: Technician[]) {
  return workOrders.map((order) => decorateWorkOrder(order, facilities, technicians));
}

export function decorateWorkOrder(workOrder: WorkOrder, facilities: Facility[], technicians: Technician[]): DecoratedWorkOrder {
  return {
    ...workOrder,
    facilityName: facilities.find((facility) => facility.id === workOrder.facilityId)?.name ?? "Unknown facility",
    assigneeName: workOrder.assigneeId
      ? technicians.find((technician) => technician.id === workOrder.assigneeId)?.name ?? "Unknown technician"
      : null,
    overdue: isOverdue(workOrder)
  };
}

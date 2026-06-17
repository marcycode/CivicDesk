import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import type { DecoratedWorkOrder } from "@/lib/view-models";
import { StatusBadge } from "@/components/StatusBadge";

export function WorkOrderTable({ workOrders }: { workOrders: DecoratedWorkOrder[] }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white/90 shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-100/70">
            <tr className="text-left text-xs uppercase tracking-[0.22em] text-stone-500">
              <th className="px-5 py-4">Work Order</th>
              <th className="px-5 py-4">Facility</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Priority</th>
              <th className="px-5 py-4">Assignee</th>
              <th className="px-5 py-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
            {workOrders.map((order) => (
              <tr className="transition hover:bg-stone-50" key={order.id}>
                <td className="px-5 py-4">
                  <Link className="font-semibold text-ink underline-offset-4 hover:underline" href={`/work-orders/${order.id}`}>
                    {order.title}
                  </Link>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-400">{order.id}</p>
                </td>
                <td className="px-5 py-4">{order.facilityName}</td>
                <td className="px-5 py-4">{order.category}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={order.status} />
                    {order.overdue ? <StatusBadge kind="meta" value="Overdue" /> : null}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge kind="priority" value={order.priority} />
                </td>
                <td className="px-5 py-4">{order.assigneeName ?? "Unassigned"}</td>
                <td className="px-5 py-4">{formatDateTime(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

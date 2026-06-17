import { FilterBar } from "@/components/FilterBar";
import { StatCard } from "@/components/StatCard";
import { WorkOrderTable } from "@/components/WorkOrderTable";
import { formatHours } from "@/lib/format";
import { getFacilities, getMetrics, getTechnicians, listWorkOrders } from "@/lib/store";
import { toWorkOrderFilters } from "@/lib/validators";
import { decorateWorkOrders } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = toWorkOrderFilters({
    status: pickString(params.status),
    priority: pickString(params.priority),
    category: pickString(params.category),
    facilityId: pickString(params.facilityId),
    assigneeId: pickString(params.assigneeId)
  });

  const [facilities, technicians, workOrders, metrics] = await Promise.all([
    getFacilities(),
    getTechnicians(),
    listWorkOrders(filters),
    getMetrics()
  ]);

  const decorated = decorateWorkOrders(workOrders, facilities, technicians);

  return (
    <main className="grid gap-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard accent="#1f4d3a" label="Mean Resolution" value={formatHours(metrics.meanTimeToResolutionHours)} />
        <StatCard accent="#a14a2a" label="Overdue Orders" value={String(metrics.overdueCount)} />
        <StatCard
          accent="#d2a855"
          label="Open Backlog"
          value={String(Object.values(metrics.openBacklogByPriority).reduce((sum, value) => sum + value, 0))}
        />
        <StatCard
          accent="#475569"
          label="Top Technician Load"
          value={metrics.technicianLoad[0] ? `${metrics.technicianLoad[0].technicianName} (${metrics.technicianLoad[0].openCount})` : "N/A"}
        />
      </section>

      <section className="grid gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">Operations Queue</p>
            <h1 className="font-[var(--font-heading)] text-4xl text-ink">Live work-order backlog</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-stone-600">
            Dispatchers can filter the queue, open a ticket, update status, assign technicians, and track overdue work against each priority SLA.
          </p>
        </div>
        <FilterBar currentFilters={filters} facilities={facilities} technicians={technicians} />
      </section>

      <WorkOrderTable workOrders={decorated} />
    </main>
  );
}

function pickString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

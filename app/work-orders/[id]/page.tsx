import Link from "next/link";
import { CommentForm } from "@/components/CommentForm";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkOrderActions } from "@/components/WorkOrderActions";
import { formatDateTime } from "@/lib/format";
import { getFacilities, getTechnicians, getWorkOrder } from "@/lib/store";
import { decorateWorkOrder } from "@/lib/view-models";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [workOrder, facilities, technicians] = await Promise.all([getWorkOrder(id), getFacilities(), getTechnicians()]);

  if (!workOrder) {
    notFound();
  }

  const decorated = decorateWorkOrder(workOrder, facilities, technicians);

  return (
    <main className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
      <section className="grid gap-6">
        <div className="rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">{decorated.id}</p>
              <h1 className="font-[var(--font-heading)] text-4xl text-ink">{decorated.title}</h1>
              <p className="max-w-3xl text-sm leading-7 text-stone-600">{decorated.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={decorated.status} />
              <StatusBadge kind="priority" value={decorated.priority} />
              {decorated.overdue ? <StatusBadge kind="meta" value="Overdue" /> : null}
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Meta label="Facility" value={decorated.facilityName} />
            <Meta label="Assignee" value={decorated.assigneeName ?? "Unassigned"} />
            <Meta label="Requester" value={decorated.requesterName} />
            <Meta label="Updated" value={formatDateTime(decorated.updatedAt)} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-ink">Activity Log</h2>
              <Link className="text-sm font-semibold text-stone-500 underline-offset-4 hover:underline" href="/">
                Back to queue
              </Link>
            </div>
            <div className="mt-5 grid gap-4">
              {decorated.activity
                .slice()
                .reverse()
                .map((event) => (
                  <article className="rounded-[1.5rem] border border-stone-100 bg-stone-50 p-4" key={event.id}>
                    <p className="text-sm font-semibold text-ink">{event.message}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-400">{formatDateTime(event.createdAt)}</p>
                  </article>
                ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-card">
            <h2 className="text-xl font-semibold text-ink">Comments</h2>
            <div className="mt-5 grid gap-4">
              {decorated.comments.length === 0 ? (
                <p className="text-sm text-stone-500">No comments yet.</p>
              ) : (
                decorated.comments
                  .slice()
                  .reverse()
                  .map((comment) => (
                    <article className="rounded-[1.5rem] border border-stone-100 bg-stone-50 p-4" key={comment.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">{comment.author}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-stone-400">{formatDateTime(comment.createdAt)}</p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-stone-600">{comment.message}</p>
                    </article>
                  ))
              )}
            </div>
          </section>
        </div>
      </section>

      <aside className="grid gap-6 self-start">
        <WorkOrderActions
          currentAssigneeId={decorated.assigneeId}
          currentPriority={decorated.priority}
          currentStatus={decorated.status}
          technicians={technicians}
          workOrderId={decorated.id}
        />
        <CommentForm workOrderId={decorated.id} />
      </aside>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-ink">{value}</p>
    </div>
  );
}

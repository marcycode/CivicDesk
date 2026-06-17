import { NewWorkOrderForm } from "@/components/NewWorkOrderForm";
import { getFacilities, getTechnicians } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewWorkOrderPage() {
  const [facilities, technicians] = await Promise.all([getFacilities(), getTechnicians()]);

  return (
    <main className="grid gap-6">
      <section className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">Requester Intake</p>
        <h1 className="font-[var(--font-heading)] text-4xl text-ink">Create a new maintenance request</h1>
        <p className="max-w-2xl text-sm leading-6 text-stone-600">
          Collect the issue, facility, category, and urgency in one place so the facilities team can route work immediately.
        </p>
      </section>
      <NewWorkOrderForm facilities={facilities} technicians={technicians} />
    </main>
  );
}

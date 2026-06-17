"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { priorities, statuses, type Technician } from "@/lib/types";

export function WorkOrderActions({
  workOrderId,
  currentStatus,
  currentPriority,
  currentAssigneeId,
  technicians
}: {
  workOrderId: string;
  currentStatus: string;
  currentPriority: string;
  currentAssigneeId: string | null;
  technicians: Technician[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const assigneeId = String(formData.get("assigneeId") ?? "");
    const response = await fetch(`/api/work-orders/${workOrderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: String(formData.get("status") ?? ""),
        priority: String(formData.get("priority") ?? ""),
        assigneeId: assigneeId || null
      })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to update work order");
      setBusy(false);
      return;
    }

    router.refresh();
    setBusy(false);
  }

  return (
    <form className="grid gap-4 rounded-[2rem] border border-stone-200 bg-white/90 p-5 shadow-card" onSubmit={handleUpdate}>
      <h3 className="text-lg font-semibold text-ink">Dispatch Actions</h3>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Status
        <select className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3" defaultValue={currentStatus} name="status">
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Priority
        <select className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3" defaultValue={currentPriority} name="priority">
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Assignee
        <select className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3" defaultValue={currentAssigneeId ?? ""} name="assigneeId">
          <option value="">Unassigned</option>
          {technicians.map((technician) => (
            <option key={technician.id} value={technician.id}>
              {technician.name}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      <button className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173b2d]" disabled={busy} type="submit">
        {busy ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}

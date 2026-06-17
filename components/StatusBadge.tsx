import type { Priority, Status } from "@/lib/types";

export function StatusBadge({ value, kind = "status" }: { value: Status | Priority | "Overdue"; kind?: "status" | "priority" | "meta" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${badgeClasses(value, kind)}`}
    >
      {value}
    </span>
  );
}

function badgeClasses(value: Status | Priority | "Overdue", kind: "status" | "priority" | "meta") {
  if (value === "Urgent" || value === "Overdue") return "bg-rose-100 text-rose-700";
  if (value === "High" || value === "In Progress") return "bg-amber-100 text-amber-800";
  if (value === "Assigned") return "bg-sky-100 text-sky-700";
  if (value === "Resolved" || value === "Closed") return "bg-emerald-100 text-emerald-700";
  if (kind === "meta") return "bg-stone-200 text-stone-700";
  return "bg-stone-100 text-stone-700";
}

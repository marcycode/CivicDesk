import Link from "next/link";
import { categories, priorities, statuses, type Facility, type Technician } from "@/lib/types";

export function FilterBar({
  facilities,
  technicians,
  currentFilters
}: {
  facilities: Facility[];
  technicians: Technician[];
  currentFilters: Record<string, string | undefined>;
}) {
  return (
    <form className="grid gap-3 rounded-[2rem] border border-stone-200 bg-white/85 p-5 shadow-card md:grid-cols-6">
      <FilterSelect name="status" label="Status" options={statuses} value={currentFilters.status} />
      <FilterSelect name="priority" label="Priority" options={priorities} value={currentFilters.priority} />
      <FilterSelect name="category" label="Category" options={categories} value={currentFilters.category} />
      <FilterSelect
        name="facilityId"
        label="Facility"
        options={facilities.map((facility) => ({ value: facility.id, label: facility.name }))}
        value={currentFilters.facilityId}
      />
      <FilterSelect
        name="assigneeId"
        label="Assignee"
        options={technicians.map((technician) => ({ value: technician.id, label: technician.name }))}
        value={currentFilters.assigneeId}
      />
      <div className="flex items-end gap-3">
        <button className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#173b2d]" type="submit">
          Apply
        </button>
        <Link className="text-sm font-semibold text-stone-600 underline-offset-4 hover:underline" href="/">
          Clear
        </Link>
      </div>
    </form>
  );
}

function FilterSelect({
  name,
  label,
  options,
  value
}: {
  name: string;
  label: string;
  options: readonly string[] | Array<{ value: string; label: string }>;
  value?: string;
}) {
  const normalized = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );

  return (
    <label className="grid gap-2 text-sm font-medium text-stone-700">
      {label}
      <select
        className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-pine"
        defaultValue={value ?? ""}
        name={name}
      >
        <option value="">All</option>
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ChangeEvent } from "react";
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function applyFilter(name: string, value: string) {
    const params = new URLSearchParams();
    for (const [key, current] of Object.entries(currentFilters)) {
      if (current) params.set(key, current);
    }
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/?${query}` : "/");
    });
  }

  function clearAll() {
    startTransition(() => {
      router.push("/");
    });
  }

  const hasAny = Object.values(currentFilters).some((value) => Boolean(value));

  return (
    <div
      aria-busy={isPending}
      className="grid gap-3 rounded-[2rem] border border-stone-200 bg-white/85 p-5 shadow-card md:grid-cols-6"
    >
      <FilterSelect name="status" label="Status" options={statuses} value={currentFilters.status} onChange={applyFilter} />
      <FilterSelect name="priority" label="Priority" options={priorities} value={currentFilters.priority} onChange={applyFilter} />
      <FilterSelect name="category" label="Category" options={categories} value={currentFilters.category} onChange={applyFilter} />
      <FilterSelect
        name="facilityId"
        label="Facility"
        options={facilities.map((facility) => ({ value: facility.id, label: facility.name }))}
        value={currentFilters.facilityId}
        onChange={applyFilter}
      />
      <FilterSelect
        name="assigneeId"
        label="Assignee"
        options={technicians.map((technician) => ({ value: technician.id, label: technician.name }))}
        value={currentFilters.assigneeId}
        onChange={applyFilter}
      />
      <div className="flex items-end">
        <button
          className="text-sm font-semibold text-stone-600 underline-offset-4 hover:underline disabled:opacity-40"
          disabled={!hasAny || isPending}
          onClick={clearAll}
          type="button"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

function FilterSelect({
  name,
  label,
  options,
  value,
  onChange
}: {
  name: string;
  label: string;
  options: readonly string[] | Array<{ value: string; label: string }>;
  value?: string;
  onChange: (name: string, value: string) => void;
}) {
  const normalized = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(name, event.target.value);
  }

  return (
    <label className="grid gap-2 text-sm font-medium text-stone-700">
      {label}
      <select
        className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-pine"
        name={name}
        onChange={handleChange}
        value={value ?? ""}
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

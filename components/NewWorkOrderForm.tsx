"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { categories, priorities, type Facility, type Technician } from "@/lib/types";

export function NewWorkOrderForm({
  facilities,
  technicians
}: {
  facilities: Facility[];
  technicians: Technician[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      requesterName: String(formData.get("requesterName") ?? ""),
      facilityId: String(formData.get("facilityId") ?? ""),
      category: String(formData.get("category") ?? ""),
      priority: String(formData.get("priority") ?? ""),
      assigneeId: String(formData.get("assigneeId") ?? "") || undefined
    };

    const response = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to create work order");
      setSubmitting(false);
      return;
    }

    const created = (await response.json()) as { id: string };
    router.push(`/work-orders/${created.id}`);
    router.refresh();
  }

  return (
    <form className="grid gap-5 rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-card" onSubmit={handleSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Title" name="title" required />
        <Field label="Requester" name="requesterName" required />
      </div>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Description
        <textarea
          className="min-h-36 rounded-[1.5rem] border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-pine"
          name="description"
          required
        />
      </label>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SelectField
          label="Facility"
          name="facilityId"
          options={facilities.map((facility) => ({ value: facility.id, label: facility.name }))}
          required
        />
        <SelectField label="Category" name="category" options={categories.map((value) => ({ value, label: value }))} required />
        <SelectField label="Priority" name="priority" options={priorities.map((value) => ({ value, label: value }))} required />
        <SelectField
          label="Assign Technician"
          name="assigneeId"
          options={[{ value: "", label: "Leave unassigned" }, ...technicians.map((tech) => ({ value: tech.id, label: tech.name }))]}
        />
      </div>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      <div className="flex justify-end">
        <button className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173b2d]" disabled={submitting} type="submit">
          {submitting ? "Creating..." : "Create Work Order"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, name, required = false }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-stone-700">
      {label}
      <input
        className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-pine"
        name={name}
        required={required}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  required = false
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-stone-700">
      {label}
      <select
        className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-pine"
        defaultValue=""
        name={name}
        required={required}
      >
        <option disabled value="">
          Select...
        </option>
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

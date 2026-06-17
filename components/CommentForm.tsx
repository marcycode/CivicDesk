"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function CommentForm({ workOrderId }: { workOrderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch(`/api/work-orders/${workOrderId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: String(formData.get("author") ?? ""),
        message: String(formData.get("message") ?? "")
      })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to add comment");
      setBusy(false);
      return;
    }

    form.reset();
    router.refresh();
    setBusy(false);
  }

  return (
    <form className="grid gap-4 rounded-[2rem] border border-stone-200 bg-white/90 p-5 shadow-card" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold text-ink">Add Comment</h3>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Author
        <input className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3" name="author" required />
      </label>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Note
        <textarea className="min-h-28 rounded-[1.5rem] border border-stone-200 bg-stone-50 px-4 py-3" name="message" required />
      </label>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      <button className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black" disabled={busy} type="submit">
        {busy ? "Posting..." : "Post Comment"}
      </button>
    </form>
  );
}

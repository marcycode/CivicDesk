"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function AboutButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        aria-label="About CivicDesk"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-sm font-semibold text-stone-600 transition hover:border-pine hover:text-pine"
        onClick={() => setOpen(true)}
        type="button"
      >
        i
      </button>
      {open && mounted
        ? createPortal(
        <div
          aria-labelledby="about-title"
          aria-modal="true"
          className="fixed inset-0 z-[9999] grid h-screen w-screen place-items-center bg-stone-900/70 p-4 backdrop-blur-md"
          onClick={() => setOpen(false)}
          role="dialog"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div
            className="relative m-auto grid max-h-[85vh] w-full max-w-md gap-4 overflow-y-auto rounded-[2rem] border border-stone-200 bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Close"
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-base font-semibold text-stone-600 transition hover:border-pine hover:text-pine"
              onClick={() => setOpen(false)}
              type="button"
            >
              &times;
            </button>
            <div className="pr-10">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rust">About</p>
              <h2 className="mt-1 font-[var(--font-heading)] text-2xl text-ink" id="about-title">
                CivicDesk
              </h2>
            </div>
            <ul className="grid gap-3 text-sm leading-6 text-stone-700">
              <li>
                <span className="font-semibold text-ink">What it is.</span> A facilities service desk MVP for city
                operations teams: create work orders, triage the queue, assign technicians, and watch SLA-driven
                metrics update live.
              </li>
              <li>
                <span className="font-semibold text-ink">Who it&apos;s for.</span> Requesters submit issues,
                dispatchers route them, technicians resolve them, and leadership reads the operational metrics on
                the dashboard.
              </li>
              <li>
                <span className="font-semibold text-ink">How to try it.</span> Submit a request from{" "}
                <span className="font-semibold">New Request</span>, then change Status / Priority / Assignee on the{" "}
                <span className="font-semibold">Queue</span> filters &mdash; the table refreshes automatically.
              </li>
            </ul>
            <p className="text-xs text-stone-500">
              Same domain layer powers an MCP server (stdio JSON-RPC) and an HTTP bridge at{" "}
              <code className="rounded bg-stone-100 px-1 py-0.5 text-[11px]">/api/mcp</code>.
            </p>
            <a
              className="justify-self-start rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#173b2d]"
              href="https://github.com/marcycode/CivicDesk"
              rel="noreferrer"
              target="_blank"
            >
              View on GitHub
            </a>
          </div>
        </div>,
            document.body
          )
        : null}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AboutButton } from "@/components/AboutButton";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "CivicDesk",
  description: "Facilities service desk for civic operations."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-[var(--font-body)]">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <header className="mb-8 flex flex-col gap-5 rounded-[2.25rem] border border-stone-200 bg-white/75 px-6 py-6 shadow-card backdrop-blur md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rust">Municipal Facilities Service Desk</p>
              <div className="mt-2 flex items-center gap-3">
                <Link className="block font-[var(--font-heading)] text-4xl text-ink" href="/">
                  CivicDesk
                </Link>
                <AboutButton />
              </div>
            </div>
            <nav className="flex flex-wrap gap-3 text-sm font-semibold">
              <Link className="rounded-full border border-stone-200 px-4 py-2 text-stone-700 transition hover:border-pine hover:text-pine" href="/">
                Queue
              </Link>
              <Link className="rounded-full bg-pine px-4 py-2 text-white transition hover:bg-[#173b2d]" href="/new">
                New Request
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

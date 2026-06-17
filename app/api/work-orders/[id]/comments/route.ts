import { NextResponse } from "next/server";
import { addComment } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const comment = await addComment(id, {
      author: String(body.author ?? ""),
      message: String(body.message ?? "")
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : ((error as { message?: string })?.message ?? "Unknown error");
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

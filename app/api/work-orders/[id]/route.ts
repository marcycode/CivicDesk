import { NextResponse } from "next/server";
import { getWorkOrder, updateWorkOrder } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workOrder = await getWorkOrder(id);
  if (!workOrder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(workOrder);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const workOrder = await updateWorkOrder(id, {
      status: body.status ? String(body.status) as never : undefined,
      priority: body.priority ? String(body.priority) as never : undefined,
      assigneeId: body.assigneeId === null ? null : body.assigneeId ? String(body.assigneeId) : undefined
    });

    return NextResponse.json(workOrder);
  } catch (error) {
    const msg = error instanceof Error ? error.message : ((error as { message?: string })?.message ?? "Unknown error");
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

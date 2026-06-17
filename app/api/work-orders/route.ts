import { NextResponse } from "next/server";
import { createWorkOrder, listWorkOrders } from "@/lib/store";
import { toWorkOrderFilters } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const workOrders = await listWorkOrders(
    toWorkOrderFilters({
    status: searchParams.get("status") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    facilityId: searchParams.get("facilityId") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    assigneeId: searchParams.get("assigneeId") ?? undefined
    })
  );

  return NextResponse.json(workOrders);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const workOrder = await createWorkOrder({
      title: String(body.title ?? ""),
      description: String(body.description ?? ""),
      facilityId: String(body.facilityId ?? ""),
      category: String(body.category ?? "") as never,
      priority: String(body.priority ?? "") as never,
      requesterName: String(body.requesterName ?? ""),
      assigneeId: body.assigneeId ? String(body.assigneeId) : undefined
    });

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

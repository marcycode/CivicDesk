import { NextResponse } from "next/server";
import { invokeMcpTool, mcpTools } from "@/lib/mcp";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ tools: mcpTools });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tool?: string; arguments?: Record<string, unknown> };
    if (!body.tool) {
      return NextResponse.json({ error: "tool is required" }, { status: 400 });
    }

    const result = await invokeMcpTool(body.tool, body.arguments ?? {});
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

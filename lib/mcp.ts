import {
  addComment,
  createWorkOrder,
  getMetrics,
  getWorkOrder,
  getTechnicians,
  listWorkOrders,
  updateWorkOrder
} from "@/lib/store";
import { asCategory, asPriority, asStatus } from "@/lib/validators";

export const mcpTools = [
  {
    name: "list_work_orders",
    description: "List work orders with optional filters for status, priority, facility, category, and assignee.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string" },
        priority: { type: "string" },
        facilityId: { type: "string" },
        category: { type: "string" },
        assigneeId: { type: "string" }
      }
    }
  },
  {
    name: "get_work_order",
    description: "Get full details for a single work order by id.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" }
      }
    }
  },
  {
    name: "create_work_order",
    description: "Create a new work order from structured fields.",
    inputSchema: {
      type: "object",
      required: ["title", "description", "facilityId", "category", "priority", "requesterName"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        facilityId: { type: "string" },
        category: { type: "string" },
        priority: { type: "string" },
        requesterName: { type: "string" },
        assigneeId: { type: "string" }
      }
    }
  },
  {
    name: "update_work_order",
    description: "Change status, priority, or assignment for an existing work order.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        status: { type: "string" },
        priority: { type: "string" },
        assigneeId: { type: ["string", "null"] }
      }
    }
  },
  {
    name: "add_comment",
    description: "Append a comment to a work order.",
    inputSchema: {
      type: "object",
      required: ["workOrderId", "author", "message"],
      properties: {
        workOrderId: { type: "string" },
        author: { type: "string" },
        message: { type: "string" }
      }
    }
  },
  {
    name: "get_metrics",
    description: "Return mean time to resolution, open backlog, overdue count, and technician load.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
] as const;

export async function invokeMcpTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "list_work_orders":
      return listWorkOrders({
        status: asStatus(asOptionalString(args.status)),
        priority: asPriority(asOptionalString(args.priority)),
        facilityId: asOptionalString(args.facilityId),
        category: asCategory(asOptionalString(args.category)),
        assigneeId: asOptionalString(args.assigneeId)
      });
    case "get_work_order":
      return getWorkOrder(asRequiredString(args.id, "id"));
    case "create_work_order":
      return createWorkOrder({
        title: asRequiredString(args.title, "title"),
        description: asRequiredString(args.description, "description"),
        facilityId: asRequiredString(args.facilityId, "facilityId"),
        category: asRequiredString(args.category, "category") as never,
        priority: asRequiredString(args.priority, "priority") as never,
        requesterName: asRequiredString(args.requesterName, "requesterName"),
        assigneeId: asOptionalString(args.assigneeId)
      });
    case "update_work_order":
      return updateWorkOrder(asRequiredString(args.id, "id"), {
        status: asOptionalString(args.status) as never,
        priority: asOptionalString(args.priority) as never,
        assigneeId: args.assigneeId === null ? null : asOptionalString(args.assigneeId)
      });
    case "add_comment":
      return addComment(asRequiredString(args.workOrderId, "workOrderId"), {
        author: asRequiredString(args.author, "author"),
        message: asRequiredString(args.message, "message")
      });
    case "get_metrics":
      return getMetrics();
    case "list_technicians":
      return getTechnicians();
    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}

function asRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }

  return value;
}

function asOptionalString(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error("Expected string");
  }

  return value;
}

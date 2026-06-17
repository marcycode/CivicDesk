import { promises as fs } from "node:fs";
import path from "node:path";
import { calculateMetrics } from "@/lib/metrics";
import { isClosedStatus } from "@/lib/sla";
import {
  categories,
  priorities,
  statuses,
  type ActivityEvent,
  type Category,
  type DatabaseShape,
  type Facility,
  type Metrics,
  type Priority,
  type Status,
  type Technician,
  type WorkOrder,
  type WorkOrderComment,
  type WorkOrderFilters
} from "@/lib/types";

const dbPath = path.join(process.cwd(), "data", "db.json");

export type CreateWorkOrderInput = {
  title: string;
  description: string;
  facilityId: string;
  category: Category;
  priority: Priority;
  requesterName: string;
  assigneeId?: string | null;
};

export type UpdateWorkOrderInput = {
  status?: Status;
  priority?: Priority;
  assigneeId?: string | null;
};

export type AddCommentInput = {
  author: string;
  message: string;
};

export async function readDatabase() {
  const raw = await fs.readFile(dbPath, "utf8");
  return JSON.parse(raw) as DatabaseShape;
}

async function writeDatabase(data: DatabaseShape) {
  await fs.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function getFacilitiesJson(): Promise<Facility[]> {
  return (await readDatabase()).facilities;
}

export async function getTechniciansJson(): Promise<Technician[]> {
  return (await readDatabase()).technicians;
}

export async function listWorkOrdersJson(filters: WorkOrderFilters = {}) {
  const db = await readDatabase();

  return db.workOrders
    .filter((order) => {
      if (filters.status && order.status !== filters.status) return false;
      if (filters.priority && order.priority !== filters.priority) return false;
      if (filters.facilityId && order.facilityId !== filters.facilityId) return false;
      if (filters.category && order.category !== filters.category) return false;
      if (filters.assigneeId && order.assigneeId !== filters.assigneeId) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getWorkOrderJson(id: string) {
  const db = await readDatabase();
  return db.workOrders.find((order) => order.id === id) ?? null;
}

export async function createWorkOrderJson(input: CreateWorkOrderInput) {
  validateCreateInput(input);
  const db = await readDatabase();

  const now = new Date().toISOString();
  const created: WorkOrder = {
    id: `wo-${Date.now()}`,
    title: input.title.trim(),
    description: input.description.trim(),
    facilityId: input.facilityId,
    category: input.category,
    priority: input.priority,
    status: input.assigneeId ? "Assigned" : "Open",
    assigneeId: input.assigneeId ?? null,
    requesterName: input.requesterName.trim(),
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    activity: [
      createActivity("created", `Work order created by ${input.requesterName.trim()}`, now),
      ...(input.assigneeId ? [createActivity("assigned", `Assigned to ${lookupTechnicianName(db.technicians, input.assigneeId)}`, now)] : [])
    ],
    comments: []
  };

  db.workOrders.push(created);
  await writeDatabase(db);
  return created;
}

export async function updateWorkOrderJson(id: string, updates: UpdateWorkOrderInput) {
  const db = await readDatabase();
  const order = db.workOrders.find((entry) => entry.id === id);
  if (!order) {
    throw new Error(`Work order ${id} not found`);
  }

  const now = new Date().toISOString();
  const activity: ActivityEvent[] = [];

  if (updates.status && updates.status !== order.status) {
    validateStatus(updates.status);
    order.status = updates.status;
    activity.push(createActivity("status_changed", `Status changed to ${updates.status}`, now));
    if (isClosedStatus(updates.status) && !order.resolvedAt) {
      order.resolvedAt = now;
    }
    if (!isClosedStatus(updates.status)) {
      order.resolvedAt = null;
    }
  }

  if (updates.priority && updates.priority !== order.priority) {
    validatePriority(updates.priority);
    order.priority = updates.priority;
    activity.push(createActivity("priority_changed", `Priority changed to ${updates.priority}`, now));
  }

  if (updates.assigneeId !== undefined && updates.assigneeId !== order.assigneeId) {
    if (updates.assigneeId !== null) {
      lookupTechnicianName(db.technicians, updates.assigneeId);
    }
    order.assigneeId = updates.assigneeId;
    activity.push(
      createActivity(
        "assigned",
        updates.assigneeId ? `Assigned to ${lookupTechnicianName(db.technicians, updates.assigneeId)}` : "Assignment cleared",
        now
      )
    );
    if (updates.assigneeId && order.status === "Open") {
      order.status = "Assigned";
      activity.push(createActivity("status_changed", "Status changed to Assigned", now));
    }
  }

  order.updatedAt = now;
  order.activity.push(...activity);

  await writeDatabase(db);
  return order;
}

export async function addCommentJson(workOrderId: string, input: AddCommentInput): Promise<WorkOrderComment> {
  if (!input.author.trim() || !input.message.trim()) {
    throw new Error("Author and message are required");
  }

  const db = await readDatabase();
  const order = db.workOrders.find((entry) => entry.id === workOrderId);
  if (!order) {
    throw new Error(`Work order ${workOrderId} not found`);
  }

  const now = new Date().toISOString();
  const comment: WorkOrderComment = {
    id: `com-${Date.now()}`,
    author: input.author.trim(),
    message: input.message.trim(),
    createdAt: now
  };

  order.comments.push(comment);
  order.activity.push(createActivity("comment_added", `Comment added by ${comment.author}`, now));
  order.updatedAt = now;
  await writeDatabase(db);
  return comment;
}

export async function getMetricsJson(): Promise<Metrics> {
  const db = await readDatabase();
  return calculateMetrics(db.workOrders, db.technicians);
}

function createActivity(type: ActivityEvent["type"], message: string, createdAt: string): ActivityEvent {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    message,
    createdAt
  };
}

function validateCreateInput(input: CreateWorkOrderInput) {
  if (!input.title.trim() || !input.description.trim() || !input.requesterName.trim()) {
    throw new Error("Title, description, and requester name are required");
  }

  validateCategory(input.category);
  validatePriority(input.priority);
}

function validateCategory(category: string): asserts category is Category {
  if (!categories.includes(category as Category)) {
    throw new Error(`Invalid category: ${category}`);
  }
}

function validatePriority(priority: string): asserts priority is Priority {
  if (!priorities.includes(priority as Priority)) {
    throw new Error(`Invalid priority: ${priority}`);
  }
}

function validateStatus(status: string): asserts status is Status {
  if (!statuses.includes(status as Status)) {
    throw new Error(`Invalid status: ${status}`);
  }
}

function lookupTechnicianName(technicians: Technician[], technicianId: string) {
  const technician = technicians.find((entry) => entry.id === technicianId);
  if (!technician) {
    throw new Error(`Technician ${technicianId} not found`);
  }

  return technician.name;
}

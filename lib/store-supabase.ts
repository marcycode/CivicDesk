import { calculateMetrics } from "@/lib/metrics";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Database } from "@/lib/supabase-types";
import type {
  ActivityEvent,
  Category,
  Facility,
  Metrics,
  Priority,
  Status,
  Technician,
  WorkOrder,
  WorkOrderComment,
  WorkOrderFilters
} from "@/lib/types";
import type { AddCommentInput, CreateWorkOrderInput, UpdateWorkOrderInput } from "@/lib/store-json";

type FacilityRow = Database["public"]["Tables"]["facilities"]["Row"];
type TechnicianRow = Database["public"]["Tables"]["technicians"]["Row"];
type WorkOrderRow = Database["public"]["Tables"]["work_orders"]["Row"];
type ActivityRow = Database["public"]["Tables"]["work_order_activity"]["Row"];
type CommentRow = Database["public"]["Tables"]["work_order_comments"]["Row"];

export async function getFacilitiesSupabase(): Promise<Facility[]> {
  const supabase = getSupabaseServerClient() as any;
  const { data, error } = await supabase.from("facilities").select("id, name, address").order("name");
  if (error) throw error;
  const rows = data ?? [];
  return rows.map((facility: FacilityRow) => ({
    id: facility.id,
    name: facility.name,
    address: facility.address
  }));
}

export async function getTechniciansSupabase(): Promise<Technician[]> {
  const supabase = getSupabaseServerClient() as any;
  const { data, error } = await supabase.from("technicians").select("id, name, trade").eq("active", true).order("name");
  if (error) throw error;
  const rows = data ?? [];
  return rows.map((technician: TechnicianRow) => ({
    id: technician.id,
    name: technician.name,
    trade: technician.trade
  }));
}

export async function listWorkOrdersSupabase(filters: WorkOrderFilters = {}) {
  const supabase = getSupabaseServerClient() as any;
  let query = supabase
    .from("work_orders")
    .select("id, title, description, requester_name, facility_id, category, priority, status, assigned_technician_id, created_at, updated_at, resolved_at")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.facilityId) query = query.eq("facility_id", filters.facilityId);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.assigneeId) query = query.eq("assigned_technician_id", filters.assigneeId);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];

  const ids = rows.map((row: WorkOrderRow) => row.id);
  const [activityByOrder, commentsByOrder] = await Promise.all([
    getActivityByWorkOrder(ids),
    getCommentsByWorkOrder(ids)
  ]);

  return rows.map((row: WorkOrderRow) => mapWorkOrderRow(row, activityByOrder[row.id] ?? [], commentsByOrder[row.id] ?? []));
}

export async function getWorkOrderSupabase(id: string) {
  const supabase = getSupabaseServerClient() as any;
  const { data, error } = await supabase
    .from("work_orders")
    .select("id, title, description, requester_name, facility_id, category, priority, status, assigned_technician_id, created_at, updated_at, resolved_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data;

  const [activityByOrder, commentsByOrder] = await Promise.all([
    getActivityByWorkOrder([id]),
    getCommentsByWorkOrder([id])
  ]);

  return mapWorkOrderRow(row, activityByOrder[id] ?? [], commentsByOrder[id] ?? []);
}

export async function createWorkOrderSupabase(input: CreateWorkOrderInput) {
  const supabase = getSupabaseServerClient() as any;
  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      title: input.title.trim(),
      description: input.description.trim(),
      requester_name: input.requesterName.trim(),
      facility_id: input.facilityId,
      category: input.category,
      priority: input.priority,
      assigned_technician_id: input.assigneeId ?? null
    })
    .select("id")
    .single();

  if (error) throw error;
  return getWorkOrderSupabase(data.id) as Promise<WorkOrder>;
}

export async function updateWorkOrderSupabase(id: string, updates: UpdateWorkOrderInput) {
  const supabase = getSupabaseServerClient() as any;
  const payload: Record<string, string | null> = {};
  if (updates.status) payload.status = updates.status;
  if (updates.priority) payload.priority = updates.priority;
  if (updates.assigneeId !== undefined) payload.assigned_technician_id = updates.assigneeId;

  const { error } = await supabase.from("work_orders").update(payload).eq("id", id);
  if (error) throw error;

  const updated = await getWorkOrderSupabase(id);
  if (!updated) throw new Error(`Work order ${id} not found`);
  return updated;
}

export async function addCommentSupabase(workOrderId: string, input: AddCommentInput): Promise<WorkOrderComment> {
  const supabase = getSupabaseServerClient() as any;
  const { data, error } = await supabase
    .from("work_order_comments")
    .insert({
      work_order_id: workOrderId,
      author_name: input.author.trim(),
      message: input.message.trim()
    })
    .select("id, author_name, message, created_at")
    .single();

  if (error) throw error;
  const row = data;

  return {
    id: row.id,
    author: row.author_name,
    message: row.message,
    createdAt: row.created_at
  };
}

export async function getMetricsSupabase(): Promise<Metrics> {
  const [workOrders, technicians] = await Promise.all([listWorkOrdersSupabase(), getTechniciansSupabase()]);
  return calculateMetrics(workOrders, technicians);
}

async function getActivityByWorkOrder(workOrderIds: string[]) {
  if (workOrderIds.length === 0) {
    return {} as Record<string, ActivityEvent[]>;
  }

  const supabase = getSupabaseServerClient();
  const client = supabase as any;
  const { data, error } = await client
    .from("work_order_activity")
    .select("id, work_order_id, event_type, message, created_at")
    .in("work_order_id", workOrderIds)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const rows = data ?? [];

  return rows.reduce((acc: Record<string, ActivityEvent[]>, row: ActivityRow) => {
    acc[row.work_order_id] ??= [];
    acc[row.work_order_id].push({
      id: row.id,
      type: row.event_type,
      message: row.message,
      createdAt: row.created_at
    });
    return acc;
  }, {} as Record<string, ActivityEvent[]>);
}

async function getCommentsByWorkOrder(workOrderIds: string[]) {
  if (workOrderIds.length === 0) {
    return {} as Record<string, WorkOrderComment[]>;
  }

  const supabase = getSupabaseServerClient();
  const client = supabase as any;
  const { data, error } = await client
    .from("work_order_comments")
    .select("id, work_order_id, author_name, message, created_at")
    .in("work_order_id", workOrderIds)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const rows = data ?? [];

  return rows.reduce((acc: Record<string, WorkOrderComment[]>, row: CommentRow) => {
    acc[row.work_order_id] ??= [];
    acc[row.work_order_id].push({
      id: row.id,
      author: row.author_name,
      message: row.message,
      createdAt: row.created_at
    });
    return acc;
  }, {} as Record<string, WorkOrderComment[]>);
}

function mapWorkOrderRow(row: WorkOrderRow, activity: ActivityEvent[], comments: WorkOrderComment[]): WorkOrder {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    facilityId: row.facility_id,
    category: row.category,
    priority: row.priority,
    status: row.status,
    assigneeId: row.assigned_technician_id,
    requesterName: row.requester_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    activity,
    comments
  };
}

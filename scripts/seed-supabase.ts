import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "@/scripts/env-loader";
import type { DatabaseShape } from "@/lib/types";

loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const dbPath = path.join(process.cwd(), "data", "db.json");
const seed = JSON.parse(readFileSync(dbPath, "utf8")) as DatabaseShape;

const client = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const facilityIdMap = new Map<string, string>();
const technicianIdMap = new Map<string, string>();
const workOrderIdMap = new Map<string, string>();

for (const facility of seed.facilities) {
  const { data, error } = await client
    .from("facilities")
    .insert({
      name: facility.name,
      address: facility.address
    })
    .select("id, name")
    .single();

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    const existing = await client.from("facilities").select("id, name").eq("name", facility.name).maybeSingle();
    if (existing.error || !existing.data) {
      throw error;
    }
    facilityIdMap.set(facility.id, existing.data.id);
    continue;
  }

  facilityIdMap.set(facility.id, data?.id ?? "");
}

for (const technician of seed.technicians) {
  const { data, error } = await client
    .from("technicians")
    .insert({
      name: technician.name,
      trade: technician.trade
    })
    .select("id, name")
    .single();

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    const existing = await client.from("technicians").select("id, name").eq("name", technician.name).maybeSingle();
    if (existing.error || !existing.data) {
      throw error;
    }
    technicianIdMap.set(technician.id, existing.data.id);
    continue;
  }

  technicianIdMap.set(technician.id, data?.id ?? "");
}

for (const workOrder of seed.workOrders) {
  const facilityId = facilityIdMap.get(workOrder.facilityId);
  const technicianId = workOrder.assigneeId ? technicianIdMap.get(workOrder.assigneeId) ?? null : null;

  if (!facilityId) {
    throw new Error(`Missing facility mapping for ${workOrder.facilityId}`);
  }

  const { data, error } = await client
    .from("work_orders")
    .insert({
      title: workOrder.title,
      description: workOrder.description,
      requester_name: workOrder.requesterName,
      facility_id: facilityId,
      category: workOrder.category,
      priority: workOrder.priority,
      status: workOrder.status,
      assigned_technician_id: technicianId,
      created_at: workOrder.createdAt,
      updated_at: workOrder.updatedAt,
      resolved_at: workOrder.resolvedAt
    })
    .select("id, title")
    .single();

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    const existing = await client
      .from("work_orders")
      .select("id, title")
      .eq("title", workOrder.title)
      .eq("requester_name", workOrder.requesterName)
      .maybeSingle();

    if (existing.error || !existing.data) {
      throw error;
    }

    workOrderIdMap.set(workOrder.id, existing.data.id);
    continue;
  }

  workOrderIdMap.set(workOrder.id, data?.id ?? "");
}

const workOrders = Array.from(workOrderIdMap.values()).filter(Boolean);
if (workOrders.length > 0) {
  await client.from("work_order_activity").delete().in("work_order_id", workOrders);
}

for (const workOrder of seed.workOrders) {
  const liveWorkOrderId = workOrderIdMap.get(workOrder.id);
  if (!liveWorkOrderId) {
    throw new Error(`Missing work order mapping for ${workOrder.id}`);
  }

  for (const event of workOrder.activity) {
    const { error } = await client.from("work_order_activity").insert({
      work_order_id: liveWorkOrderId,
      event_type: event.type,
      message: event.message,
      created_at: event.createdAt
    });

    if (error) {
      throw error;
    }
  }

  for (const comment of workOrder.comments) {
    const { error } = await client.from("work_order_comments").insert({
      work_order_id: liveWorkOrderId,
      author_name: comment.author,
      message: comment.message,
      created_at: comment.createdAt
    });

    if (error) {
      throw error;
    }
  }
}

console.log(
  JSON.stringify({
    ok: true,
    inserted: {
      facilities: facilityIdMap.size,
      technicians: technicianIdMap.size,
      workOrders: workOrderIdMap.size
    }
  })
);

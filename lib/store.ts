import { getDataProvider, hasSupabaseServerConfig } from "@/lib/env";
import {
  addCommentJson,
  createWorkOrderJson,
  getFacilitiesJson,
  getMetricsJson,
  getTechniciansJson,
  getWorkOrderJson,
  listWorkOrdersJson,
  updateWorkOrderJson,
  type AddCommentInput,
  type CreateWorkOrderInput,
  type UpdateWorkOrderInput
} from "@/lib/store-json";
import {
  addCommentSupabase,
  createWorkOrderSupabase,
  getFacilitiesSupabase,
  getMetricsSupabase,
  getTechniciansSupabase,
  getWorkOrderSupabase,
  listWorkOrdersSupabase,
  updateWorkOrderSupabase
} from "@/lib/store-supabase";
import type { WorkOrderFilters } from "@/lib/types";

function usingSupabase() {
  return getDataProvider() === "supabase" && hasSupabaseServerConfig();
}

export async function getFacilities() {
  return usingSupabase() ? getFacilitiesSupabase() : getFacilitiesJson();
}

export async function getTechnicians() {
  return usingSupabase() ? getTechniciansSupabase() : getTechniciansJson();
}

export async function listWorkOrders(filters: WorkOrderFilters = {}) {
  return usingSupabase() ? listWorkOrdersSupabase(filters) : listWorkOrdersJson(filters);
}

export async function getWorkOrder(id: string) {
  return usingSupabase() ? getWorkOrderSupabase(id) : getWorkOrderJson(id);
}

export async function createWorkOrder(input: CreateWorkOrderInput) {
  return usingSupabase() ? createWorkOrderSupabase(input) : createWorkOrderJson(input);
}

export async function updateWorkOrder(id: string, updates: UpdateWorkOrderInput) {
  return usingSupabase() ? updateWorkOrderSupabase(id, updates) : updateWorkOrderJson(id, updates);
}

export async function addComment(workOrderId: string, input: AddCommentInput) {
  return usingSupabase() ? addCommentSupabase(workOrderId, input) : addCommentJson(workOrderId, input);
}

export async function getMetrics() {
  return usingSupabase() ? getMetricsSupabase() : getMetricsJson();
}

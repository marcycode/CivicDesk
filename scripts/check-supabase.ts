import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "@/scripts/env-loader";

loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const client = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const [facilities, technicians, workOrders] = await Promise.all([
  client.from("facilities").select("id"),
  client.from("technicians").select("id"),
  client.from("work_orders").select("id")
]);

for (const result of [facilities, technicians, workOrders]) {
  if (result.error) {
    throw result.error;
  }
}

console.log(
  JSON.stringify({
    ok: true,
    host: new URL(url).host,
    counts: {
      facilities: facilities.data?.length ?? 0,
      technicians: technicians.data?.length ?? 0,
      workOrders: workOrders.data?.length ?? 0
    }
  })
);

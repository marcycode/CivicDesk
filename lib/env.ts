export function getDataProvider() {
  return process.env.DATA_PROVIDER === "supabase" ? "supabase" : "json";
}

export function hasSupabaseServerConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

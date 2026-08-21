import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

// Service-role client, omzeilt RLS. Uitsluitend server-side gebruiken, in de
// Stripe-webhook, om betalingen af te rekenen. Nooit naar de client sturen.
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt")
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  })
}

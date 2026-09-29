import { createServiceClient } from "@/lib/supabase/service"

// Verwerkt refunds/disputes/mislukte betalingen op collecte-bijdragen. Zoekt de bijdrage
// via de payment intent en draait de bijdrage + haar grootboek-effecten terug (of herstelt
// bij een gewonnen dispute). Bijdragen die hier niet gevonden worden (bv. pot-donaties of
// keeper-abonnementen) worden overgeslagen — die lopen via hun eigen flow.
async function vindContributie(intent: string) {
  const svc = createServiceClient()
  const { data } = await svc
    .from("contributions")
    .select("id, status")
    .eq("stripe_payment_intent", intent)
    .maybeSingle()
  return data
}

// Volledige terugbetaling → bijdrage 'terugbetaald', split + pot-credit teruggedraaid.
export async function verwerkRefund(intent: string): Promise<boolean> {
  const c = await vindContributie(intent)
  if (!c) return true
  const svc = createServiceClient()
  const { error } = await svc.rpc("reverse_contribution", {
    p_contribution: c.id,
    p_status: "terugbetaald",
  })
  return !error
}

// Dispute geopend → conservatief: bijdrage 'betwist', grootboek-effecten teruggedraaid.
export async function verwerkDispute(intent: string): Promise<boolean> {
  const c = await vindContributie(intent)
  if (!c) return true
  const svc = createServiceClient()
  const { error } = await svc.rpc("reverse_contribution", {
    p_contribution: c.id,
    p_status: "betwist",
  })
  return !error
}

// Dispute gesloten: gewonnen → herstellen (settle opnieuw); verloren → 'terugbetaald'.
export async function verwerkDisputeGesloten(
  intent: string,
  gewonnen: boolean,
): Promise<boolean> {
  const c = await vindContributie(intent)
  if (!c) return true
  const svc = createServiceClient()
  if (gewonnen) {
    const { error } = await svc.rpc("settle_contribution", {
      p_contribution: c.id,
      p_intent: intent,
    })
    return !error
  }
  const { error } = await svc.rpc("reverse_contribution", {
    p_contribution: c.id,
    p_status: "terugbetaald",
  })
  return !error
}

// Mislukte betaling op een nog niet-afgerekende bijdrage → 'mislukt' (geen grootboek).
export async function verwerkMislukt(intent: string): Promise<boolean> {
  const c = await vindContributie(intent)
  if (!c || c.status !== "wachtend") return true
  const svc = createServiceClient()
  const { error } = await svc.rpc("reverse_contribution", {
    p_contribution: c.id,
    p_status: "mislukt",
  })
  return !error
}

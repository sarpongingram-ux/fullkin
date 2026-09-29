"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { revalidatePath } from "next/cache"

// Bevestigt dat twee nodes dezelfde persoon zijn — hierdoor verbinden de families
// zich en verschijnen nieuwe familieleden.
export async function bevestigMatch(
  a: string,
  b: string,
): Promise<{ ok: boolean; fout?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("bevestig_persoon_match", {
    p_a: a,
    p_b: b,
  })
  if (error) return { ok: false, fout: "Kon de match niet bevestigen." }
  revalidatePath("/app/ontdek")
  revalidatePath("/app")
  return { ok: true }
}

// Wijst een voorgestelde match persistent af ("Nee, ander persoon"). De beslissing
// wordt onthouden (person_match_decisions), zodat het paar niet opnieuw wordt voorgesteld.
export async function wijsMatchAf(
  a: string,
  b: string,
): Promise<{ ok: boolean; fout?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("wijs_match_af", { p_a: a, p_b: b })
  if (error) return { ok: false, fout: "Kon de match niet afwijzen." }
  revalidatePath("/app/ontdek")
  revalidatePath("/app")
  return { ok: true }
}

// Zeg hallo tegen een ontdekt familielid (vriendelijke wave, geen open chat).
export async function zegHallo(
  naar: string,
): Promise<{ ok: boolean; fout?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("zeg_hallo", { p_naar: naar })
  if (error) return { ok: false, fout: "Kon geen hallo sturen." }
  revalidatePath(`/app/ontdek/${naar}`)
  revalidatePath("/app/ontdek")
  return { ok: true }
}

// Stuur een bericht in het tweeweg-gesprek met een ontdekt familielid (CONNECT).
export async function stuurOntdekBericht(
  ander: string,
  tekst: string,
): Promise<{ ok: boolean; fout?: string }> {
  const schoon = tekst.trim()
  if (!schoon) return { ok: false, fout: "Typ eerst een bericht." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("stuur_ontdek_bericht", {
    p_ander: ander,
    p_tekst: schoon,
  })
  if (error) return { ok: false, fout: error.message || "Kon het bericht niet versturen." }
  revalidatePath(`/app/ontdek/${ander}`)
  revalidatePath("/app/ontdek")
  return { ok: true }
}

export type OntdekUploadResultaat =
  | { ok: true; pad: string; token: string }
  | { ok: false; fout: string }

// Geautoriseerde upload-link voor een foto in de ontdek-chat (private bucket, cross-family).
// De client uploadt rechtstreeks naar deze link (omzeilt anon-token + Vercel-body-limiet).
export async function maakOntdekFotoUploadUrl(
  ext: string,
): Promise<OntdekUploadResultaat> {
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Je bent niet ingelogd." }

  const veiligExt =
    (ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg"
  const pad = `${crypto.randomUUID()}.${veiligExt}`
  try {
    const svc = createServiceClient()
    const { data, error } = await svc.storage
      .from("ontdek-media")
      .createSignedUploadUrl(pad)
    if (error || !data?.token) {
      return { ok: false, fout: "Kon de upload niet voorbereiden." }
    }
    return { ok: true, pad: data.path, token: data.token }
  } catch {
    return { ok: false, fout: "Uploaden kan nu even niet. Probeer het straks opnieuw." }
  }
}

// Stuur een foto (met optioneel bijschrift) in het ontdek-gesprek. Autorisatie
// (ontdekte familie) zit in de RPC.
export async function stuurOntdekFoto(
  ander: string,
  pad: string,
  caption?: string,
): Promise<{ ok: boolean; fout?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("stuur_ontdek_bericht", {
    p_ander: ander,
    p_tekst: caption?.trim() || undefined,
    p_foto_pad: pad,
  })
  if (error) return { ok: false, fout: error.message || "Kon de foto niet versturen." }
  revalidatePath(`/app/ontdek/${ander}`)
  revalidatePath("/app/ontdek")
  return { ok: true }
}

// Markeer het gesprek met een ontdekt familielid als gelezen.
export async function markeerOntdekGelezen(ander: string): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc("markeer_ontdek_gelezen", { p_ander: ander })
  revalidatePath("/app/ontdek")
}

import { createClient } from "@/lib/supabase/server"
import { LidOnboarding } from "./LidOnboarding"

export default async function Welkom({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  // invite_preview is callable door anon, werkt ook zonder inloggen.
  const { data: preview } = await supabase
    .rpc("invite_preview", { invite_token: token })
    .single()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!preview) {
    return (
      <Kader>
        <h1 className="text-2xl font-black text-inkt mb-2">
          Uitnodiging niet gevonden
        </h1>
        <p className="text-inkt-zacht text-sm">
          Deze link klopt niet meer. Vraag degene die je uitnodigde om een
          nieuwe.
        </p>
      </Kader>
    )
  }

  if (preview.status !== "open" || preview.expired) {
    return (
      <Kader>
        <h1 className="text-2xl font-black text-inkt mb-2">
          Deze uitnodiging is niet meer geldig
        </h1>
        <p className="text-inkt-zacht text-sm">
          {preview.expired
            ? "De uitnodiging is verlopen."
            : "Deze plek is al geclaimd."}{" "}
          Vraag je familie om een nieuwe uitnodiging.
        </p>
      </Kader>
    )
  }

  return (
    <LidOnboarding
      token={token}
      alIngelogd={!!user}
      voornaam={preview.person_first_name}
      familieNaam={preview.network_name}
      inviterNaam={preview.inviter_name}
    />
  )
}

function Kader({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm fk-card-white" style={{ padding: 28 }}>
        {children}
      </div>
    </main>
  )
}

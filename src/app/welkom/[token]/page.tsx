import { createClient } from "@/lib/supabase/server"
import { Claimen } from "./Claimen"

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
    <Kader>
      <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
        FULLKIN
      </p>
      <h1 className="text-2xl font-black text-inkt mt-2 leading-snug">
        Welkom bij {preview.network_name}, {preview.person_first_name}. 👋
      </h1>
      <p className="text-inkt-zacht mt-3">
        {preview.inviter_name} heeft jou toegevoegd aan de familiekaart. Jouw
        plek staat al klaar. Kom binnen.
      </p>

      <div className="mt-6">
        <Claimen
          token={token}
          alIngelogd={!!user}
          voornaam={preview.person_first_name}
        />
      </div>

      <p className="mt-8 text-center text-sm text-inkt-zacht font-semibold">
        Welkom thuis.
      </p>
    </Kader>
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

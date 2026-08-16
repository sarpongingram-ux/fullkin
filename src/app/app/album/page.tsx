import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { tekenFotoUrls } from "@/lib/album/urls"

export default async function AlbumPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/app")

  const { data: items } = await supabase
    .from("album_items")
    .select("id, file_url, title, created_at")
    .order("created_at", { ascending: false })

  const urls = await tekenFotoUrls(
    supabase,
    (items ?? []).map((i) => i.file_url),
  )

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-5 py-10">
      <Link href="/app" className="text-sm text-inkt-zacht hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header className="mt-4 mb-6">
        <p className="text-terracotta font-semibold tracking-[0.25em] text-xs">
          FAMILIEALBUM
        </p>
        <h1 className="text-2xl font-bold text-inkt mt-1">Ons Familiealbum</h1>
      </header>

      <Link
        href="/app/album/nieuw"
        className="block w-full rounded-xl bg-terracotta py-4 text-center text-white font-medium hover:bg-terracotta-diep transition mb-6"
      >
        Voeg een herinnering toe +
      </Link>

      {(items ?? []).length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-5xl mb-4">📷</p>
          <p className="text-inkt font-medium">
            Jullie album groeit met elke herinnering die je deelt.
          </p>
          <p className="text-inkt-zacht mt-1">Begin vandaag.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {(items ?? []).map((item) => (
            <Link
              key={item.id}
              href={`/app/album/${item.id}`}
              className="aspect-square rounded-lg overflow-hidden bg-klei block relative group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urls.get(item.file_url) ?? ""}
                alt={item.title ?? "Herinnering"}
                className="w-full h-full object-cover group-hover:scale-105 transition"
              />
            </Link>
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-inkt-zacht italic">
        Een warm, privé familiealbum dat van de hele familie is.
      </p>
    </main>
  )
}

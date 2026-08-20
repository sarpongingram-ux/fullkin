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

  const [{ data: items }, { data: suggesties }] = await Promise.all([
    supabase
      .from("album_items")
      .select("id, file_url, file_type, title, created_at")
      .order("created_at", { ascending: false }),
    supabase.rpc("ontdek_verbindingen"),
  ])

  const urls = await tekenFotoUrls(
    supabase,
    (items ?? []).map((i) => i.file_url),
  )

  const ontdekkingen = (suggesties ?? []).slice(0, 3)

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <Link href="/app" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header className="mt-3 mb-6">
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          FAMILIEALBUM
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">Ons album 📷</h1>
      </header>

      <Link
        href="/app/album/nieuw"
        className="fk-btn fk-btn-primary fk-btn-full mb-6"
      >
        📷 Deel een herinnering
      </Link>

      {/* Ontdeklaag — samen op de foto, nog niet verbonden op de kaart. */}
      {ontdekkingen.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-black text-inkt mb-3">Ontdek een verbinding</h2>
          <ul className="space-y-3">
            {ontdekkingen.map((s) => (
              <li key={`${s.a_id}-${s.b_id}`} className="fk-card">
                <p className="text-inkt leading-snug">
                  <Link
                    href={`/app/persoon/${s.a_id}`}
                    className="font-bold text-terracotta hover:underline"
                  >
                    {s.a_naam}
                  </Link>{" "}
                  en{" "}
                  <Link
                    href={`/app/persoon/${s.b_id}`}
                    className="font-bold text-terracotta hover:underline"
                  >
                    {s.b_naam}
                  </Link>{" "}
                  staan samen op {s.samen} {s.samen === 1 ? "foto" : "foto's"}, maar
                  zijn nog niet verbonden op de kaart.
                </p>
                <p className="text-sm text-inkt-zacht mt-1">
                  Hoe kennen zij elkaar? Breng hun band in kaart.
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(items ?? []).length === 0 ? (
        <div className="fk-card text-center py-12">
          <p className="text-5xl mb-3">📷</p>
          <p className="font-black text-inkt text-lg">Jullie album is nog leeg</p>
          <p className="text-inkt-zacht mt-1">
            Deel de eerste herinnering van jullie familie.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {(items ?? []).map((item) => {
            const url = urls.get(item.file_url) ?? ""
            return (
              <Link
                key={item.id}
                href={`/app/album/${item.id}`}
                className="aspect-square rounded-lg overflow-hidden bg-klei block relative group"
              >
                {item.file_type === "video" ? (
                  <>
                    <video
                      src={`${url}#t=0.1`}
                      preload="metadata"
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-white text-3xl drop-shadow-lg">
                      ▶
                    </span>
                  </>
                ) : item.file_type === "audio" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-inkt/90 text-white">
                    <span className="text-3xl">🎙️</span>
                    <span className="text-[10px] mt-1 opacity-70">geluid</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={item.title ?? "Herinnering"}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                )}
              </Link>
            )
          })}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-inkt-zacht italic">
        Een warm, privé familiealbum dat van de hele familie is.
      </p>
    </main>
  )
}

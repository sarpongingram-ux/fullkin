import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl">
        <p className="text-terracotta font-extrabold tracking-[0.3em] text-sm mb-6">
          FULLKIN
        </p>
        <h1 className="text-5xl sm:text-6xl font-black leading-tight text-inkt tracking-tight">
          Your family.
          <br />
          Complete.
        </h1>
        <p className="mt-6 text-lg text-inkt-zacht leading-relaxed">
          Eén plek voor je hele familie. Blijf verbonden, bewaar de momenten en
          bouw samen aan iets groots.
        </p>

        <div className="mt-10 flex flex-col gap-3 max-w-xs mx-auto">
          <Link href="/inloggen" className="fk-btn fk-btn-primary fk-btn-full">
            Aan de slag
          </Link>
        </div>

        <p className="mt-16 text-sm text-inkt-zacht font-semibold">
          Verbinden. Bouwen. Groeien.
        </p>
      </div>
    </main>
  )
}

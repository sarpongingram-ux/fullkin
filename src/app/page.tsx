import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl">
        <p className="text-terracotta font-semibold tracking-[0.3em] text-sm mb-6">
          FULLKIN
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-inkt">
          Your family. Complete.
        </h1>
        <p className="mt-6 text-lg text-inkt-zacht">
          De plek waar je familie leeft — en waar jullie samen iets opbouwen dat
          groter is dan ieder van jullie alleen.
        </p>
        <p className="mt-4 text-sm text-inkt-zacht italic">
          Ubuntu. Ik ben volledig omdat wij compleet zijn.
        </p>

        <div className="mt-10 flex gap-3 justify-center">
          <Link
            href="/inloggen"
            className="rounded-full bg-terracotta px-8 py-3 text-white font-medium hover:bg-terracotta-diep transition"
          >
            Inloggen
          </Link>
        </div>

        <p className="mt-16 text-xs text-inkt-zacht">
          Samen verbinden. Samen bouwen. Samen groeien.
        </p>
      </div>
    </main>
  )
}

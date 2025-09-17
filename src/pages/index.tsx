import Link from "next/link";

function Bubble({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-medium shadow-sm hover:shadow-md hover:bg-gray-100 transition"
    >
      {children}
    </Link>
  );
}

export default function Landing() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-3xl font-semibold">Corepliance Demo</h1>
        <p className="text-sm text-gray-600">Choose a persona to continue.</p>
        <div className="flex flex-wrap gap-3">
          <Bubble href="/corepliance">Corepliance Team</Bubble>
          <Bubble href="/law-firm">Law Firm / Lawyer</Bubble>
          <Bubble href="/client">Client</Bubble>
          <Bubble href="/giftor">Giftor</Bubble>
        </div>
      </div>
    </main>
  );
}

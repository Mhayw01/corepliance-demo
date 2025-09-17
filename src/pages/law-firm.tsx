import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Firm = { id: string; name: string };

export default function LawFirmDashboard() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/firms");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load firms");
        if (mounted.current) setFirms(data.firms ?? []);
      } catch (e: any) {
        if (mounted.current) setError(e.message || "Error loading firms");
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    load();
    return () => {
      mounted.current = false;
    };
  }, []);

  return (
    <main className="min-h-screen p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Law Firm / Lawyer</h1>
        <Link href="/corepliance" className="text-sm text-blue-600 underline">← Corepliance</Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Select a Firm</h2>

        {loading ? (
          <div className="rounded-lg border p-4 bg-white text-sm text-gray-600">Loading firms…</div>
        ) : error ? (
          <div className="rounded-lg border p-4 bg-white text-sm text-red-600">{error}</div>
        ) : firms.length === 0 ? (
          <div className="rounded-lg border p-4 bg-white text-sm text-gray-600">
            No firms yet — create one in <Link href="/corepliance" className="underline">Corepliance</Link>.
          </div>
        ) : (
          <ul className="divide-y rounded-lg border bg-white">
            {firms.map((f) => (
              <li key={f.id} className="p-4 hover:bg-gray-50">
                <Link href={`/law-firm/${f.id}`} className="flex items-center justify-between">
                  <span className="font-medium">{f.name}</span>
                  <span className="text-xs text-gray-500">{f.id}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

import { useState, useEffect, useRef, FormEvent } from "react";

type Firm = { id: string; name: string };

const API_BASE = "/api/firms";

export default function CoreplianceDashboard() {
  const [showCreate, setShowCreate] = useState(false);
  const [firmName, setFirmName] = useState("");
  const [firms, setFirms] = useState<Firm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error(`Failed to load firms (${res.status})`);
        const data = await res.json();
        if (mountedRef.current && Array.isArray(data.firms)) {
          setFirms(data.firms);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }
    load();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function resetForm() {
    setFirmName("");
    setShowCreate(false);
    setError(null);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const name = firmName.trim();
    if (!name) {
      setError("Please enter a firm name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to create firm.");
        return;
      }
      // Prepend the newly created firm to the list
      setFirms((prev) => [data.firm as Firm, ...prev]);
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Corepliance Team</h1>
          <p className="text-gray-600 mt-1">Invite a law firm and manage your list.</p>
        </div>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="rounded-full bg-black text-white px-5 py-2 text-sm font-medium hover:opacity-90 transition"
        >
          Invite Firm
        </button>
      </header>

      {/* Create firm inline panel */}
      {showCreate && (
        <section className="rounded-xl border bg-white p-4 shadow-sm max-w-xl">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="firmName" className="block text-sm font-medium text-gray-700">
                Firm name
              </label>
              <input
                id="firmName"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="e.g. Acme Legal LLP"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-black text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {submitting ? "Creating…" : "CREATE"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Created Law Firms list */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Created Law Firms</h2>
        {loading ? (
          <div className="rounded-lg border p-4 text-sm text-gray-600 bg-white">Loading firms…</div>
        ) : firms.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-gray-600 bg-white">
            No firms yet. Click <span className="font-medium">Invite Firm</span> to add one.
          </div>
        ) : (
          <ul className="divide-y rounded-lg border bg-white">
            {firms.map((f) => (
              <li key={f.id} className="flex items-center justify-between p-4">
                <div className="font-medium">{f.name}</div>
                <div className="text-xs text-gray-500">{f.id}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

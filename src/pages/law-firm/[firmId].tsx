import type { GetServerSideProps } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { useState, useEffect, useMemo, FormEvent } from "react";

type Firm = { id: string; name: string };

type Props = {
  firm: Firm | null;
};

const FILE_TYPES = ["BUY", "SELL", "REMORTGAGE", "BUY_SELL"] as const;
type FileType = (typeof FILE_TYPES)[number];

type FileRow = {
  id: string;
  clientDisplayName: string;
  clientFirstName?: string | null;
  clientLastName?: string | null;
  clientEmail?: string | null;
  fileRef?: string | null;
  caseType: "BUY" | "SELL" | "REMORTGAGE" | "BUY_SELL";
  status: "OPEN" | "CLOSED";
  createdAt: string;
};

export default function FirmDashboard({ firm }: Props) {
  if (!firm) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-red-600">Firm not found.</p>
        <Link href="/law-firm" className="text-blue-600 underline mt-2 inline-block">
          ← Back to Law Firm
        </Link>
      </main>
    );
  }

  const firmId = firm.id; // cache non-null id for TS

  const [fileType, setFileType] = useState<FileType>("BUY");
  const [clientDisplayName, setClientDisplayName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientFirstName, setClientFirstName] = useState("");
  const [clientLastName, setClientLastName] = useState("");
  const [clientEmailConfirm, setClientEmailConfirm] = useState("");
  const [fileRef, setFileRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const derivedDisplayName = useMemo(() => {
    const fn = clientFirstName.trim();
    const ln = clientLastName.trim();
    const combined = (fn + " " + ln).trim();
    return (clientDisplayName.trim() || combined);
  }, [clientDisplayName, clientFirstName, clientLastName]);
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailValid = useMemo(() => emailRegex.test(clientEmail.trim()), [clientEmail]);
  const emailMatch = useMemo(
    () => clientEmail.trim() !== "" && clientEmailConfirm.trim() !== "" && clientEmail.trim() === clientEmailConfirm.trim(),
    [clientEmail, clientEmailConfirm]
  );
  
  const canSubmit = derivedDisplayName.length > 0 && emailValid && emailMatch && !submitting;

  const [files, setFiles] = useState<FileRow[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [query, setQuery] = useState("");
  
  useEffect(() => {
    async function load() {
      setLoadingFiles(true);
      try {
        const res = await fetch(`/api/files?firmId=${firmId}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.files)) {
          setFiles(data.files);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingFiles(false);
      }
    }
    load();
  }, [firmId]);
  
  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => {
      return (
        (f.clientDisplayName && f.clientDisplayName.toLowerCase().includes(q)) ||
        (f.fileRef && f.fileRef.toLowerCase().includes(q))
      );
    });
  }, [files, query]);

  async function refreshFiles() {
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/files?firmId=${firmId}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.files)) setFiles(data.files);
    } finally {
      setLoadingFiles(false);
    }
  }

  async function handleDelete(fileId: string) {
    if (!confirm("Delete this file?")) return;

    // Optimistic update
    setFiles(prev => prev.filter(f => f.id !== fileId));

    try {
      const res = await fetch(`/api/files?id=${fileId}`, { method: "DELETE" });
      if (!res.ok) {
        await refreshFiles();
        return;
      }
      await refreshFiles();
    } catch (e) {
      console.error(e);
      await refreshFiles();
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canSubmit) {
      setError("Please complete required fields.");
      return;
    }
    const name = derivedDisplayName;

    setSubmitting(true);
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmId: firmId,
          clientDisplayName: name,
          clientFirstName: clientFirstName.trim() || undefined,
          clientLastName: clientLastName.trim() || undefined,
          clientEmail: clientEmail.trim() || undefined,
          fileRef: fileRef.trim() || undefined,
          fileType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to create file.");
        return;
      }
      // Reset form and show success
      setClientDisplayName("");
      setClientEmail("");
      setClientFirstName("");
      setClientLastName("");
      setClientEmailConfirm("");
      setFileRef("");
      setFileType("BUY");
      setSuccess("File created successfully.");
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen p-8 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{firm.name}</h1>
          <p className="text-xs text-gray-500 mt-1">Firm ID: {firm.id}</p>
        </div>
        <Link href="/law-firm" className="text-sm text-blue-600 underline">← All Firms</Link>
      </header>

      {/* Options */}
      <section aria-label="Options" className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <a href="#create" className="rounded-xl border bg-white p-5 hover:bg-gray-50 transition">
          <div className="text-4xl mb-2">📁➕</div>
          <div className="font-medium">Create a File</div>
          <div className="text-sm text-gray-600">Start a new matter for this firm.</div>
        </a>
        <a href="#open" className="rounded-xl border bg-white p-5 hover:bg-gray-50 transition">
          <div className="text-4xl mb-2">📂</div>
          <div className="font-medium">Open Files</div>
          <div className="text-sm text-gray-600">Browse or search existing files.</div>
        </a>
      </section>

      {/* Placeholders */}
      <section id="create" className="max-w-xl">
        <h2 className="text-lg font-semibold">Create a File</h2>
        <form onSubmit={handleCreate} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Service required</div>
            <div className="flex flex-wrap gap-2">
              {FILE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFileType(t)}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-medium transition",
                    fileType === t ? "bg-black text-white" : "hover:bg-gray-50"
                  ].join(" ")}
                  aria-pressed={fileType === t}
                >
                  {t === "BUY" && "Purchase"}
                  {t === "SELL" && "Sale"}
                  {t === "REMORTGAGE" && "Re-Mortgage"}
                  {t === "BUY_SELL" && "Buy & Sell"}
                </button>
              ))}
            </div>
          </div>
        
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="clientFirstName" className="block text-sm font-medium text-gray-700">Client first name</label>
              <input
                id="clientFirstName"
                value={clientFirstName}
                onChange={(e) => setClientFirstName(e.target.value)}
                placeholder="e.g. Jane"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label htmlFor="clientLastName" className="block text-sm font-medium text-gray-700">Client surname</label>
              <input
                id="clientLastName"
                value={clientLastName}
                onChange={(e) => setClientLastName(e.target.value)}
                placeholder="e.g. Doe"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>
        
          <div>
            <label htmlFor="clientDisplayName" className="block text-sm font-medium text-gray-700">Client display name</label>
            <input
              id="clientDisplayName"
              value={clientDisplayName}
              onChange={(e) => setClientDisplayName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave blank to use: <span className="font-medium">{derivedDisplayName || "—"}</span>
            </p>
          </div>
        
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700">Client email (required)</label>
              <input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="e.g. jane@example.com"
                required
                className={[
                  "mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2",
                  clientEmail && !emailValid ? "border-red-500 focus:ring-red-200" : "focus:ring-gray-300"
                ].join(" ")}
              />
            </div>
            <div>
              <label htmlFor="clientEmailConfirm" className="block text-sm font-medium text-gray-700">Confirm client email</label>
              <input
                id="clientEmailConfirm"
                type="email"
                value={clientEmailConfirm}
                onChange={(e) => setClientEmailConfirm(e.target.value)}
                placeholder="Retype email"
                required
                className={[
                  "mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2",
                  clientEmailConfirm && !emailMatch ? "border-red-500 focus:ring-red-200" : "focus:ring-gray-300"
                ].join(" ")}
              />
              {!emailValid && clientEmail ? (
                <p className="mt-1 text-xs text-red-600">Please enter a valid email.</p>
              ) : null}
              {!emailMatch && clientEmail && clientEmailConfirm ? (
                <p className="mt-1 text-xs text-red-600">Emails do not match.</p>
              ) : null}
            </div>
          </div>
        
          <div>
            <label htmlFor="fileRef" className="block text-sm font-medium text-gray-700">Your File Ref (optional)</label>
            <input
              id="fileRef"
              value={fileRef}
              onChange={(e) => setFileRef(e.target.value)}
              placeholder="e.g. ACME-2025-001"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
        
          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}
        
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-full bg-black text-white px-5 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? "Creating…" : "CREATE FILE"}
          </button>
        </form>
      </section>

      <section id="open" className="space-y-4">
        <h2 className="text-lg font-semibold">Open Files</h2>
        <div className="flex items-center gap-2 max-w-xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by client name or file ref…"
            className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
          />
          <button
            onClick={refreshFiles}
            className="rounded-full border px-3 py-2 text-sm hover:bg-gray-50 transition"
            disabled={loadingFiles}
          >
            {loadingFiles ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      
        {loadingFiles ? (
          <div className="rounded-lg border p-4 text-sm text-gray-600 bg-white max-w-xl">Loading files…</div>
        ) : filteredFiles.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-gray-600 bg-white max-w-xl">
            {query ? "No matches for your search." : "No files yet. Create the first file above."}
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFiles.map((f) => (
              <li key={f.id} className="relative rounded-xl border bg-white p-4 hover:bg-gray-50 transition">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(f.id); }}
                  aria-label="Delete file"
                  title="Delete file"
                  className="absolute right-2 top-2 h-6 w-6 rounded-full border text-xs leading-5 text-gray-600 hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
                <Link href={`/law-firm/${firmId}/files/${f.id}`} className="block">
                  <div className="text-3xl">📂</div>
                  <div className="mt-2 font-medium">{f.clientDisplayName}</div>
                  <div className="text-xs text-gray-600">
                    {f.fileRef ? `${f.fileRef} • ` : ""}{f.caseType} • {new Date(f.createdAt).toLocaleDateString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const firmId = ctx.params?.firmId as string | undefined;
  if (!firmId) return { props: { firm: null } };

  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { id: true, name: true },
  });

  return { props: { firm } };
};

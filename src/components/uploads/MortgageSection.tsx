import { useEffect, useState } from "react";
import UploadWidget from "@/components/uploads/UploadWidget";

type Props = { fileId: string };

type LocalUpload = {
  id: string;
  filename: string;
  size: number;
  mime: string;
  uploadedAt: string;
  sourceKey: "MORTGAGE" | "SAVINGS";
  category: string | null;
  analysis?: any;
};

type PersistedUpload = LocalUpload;

export default function MortgageSection({ fileId }: Props) {
  const [items, setItems] = useState<LocalUpload[]>([]);
  const [persisted, setPersisted] = useState<PersistedUpload[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sectionAccepted =
    persisted.some((u) => u.analysis?.status === "ACCEPTED") ||
    items.some((u) => u.analysis?.status === "ACCEPTED");
  const hasAnyUploads = persisted.length > 0 || items.length > 0;

  async function loadPersisted() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/client/transaction?fileId=${fileId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load uploads");
      const td = data?.file?.transactionDetails || {};
      const all = Array.isArray(td.uploads) ? td.uploads : [];
      const mine = all.filter((u: any) => u?.sourceKey === "MORTGAGE");
      setPersisted(mine as PersistedUpload[]);
    } catch (e: any) {
      setLoadError("Could not load existing uploads.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(uploadId: string, list: "persisted" | "session") {
    try {
      const res = await fetch("/api/uploads/metadata", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, uploadId }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data?.error || "Failed to remove upload");
        return;
      }
      if (list === "persisted") {
        setPersisted((prev) => prev.filter((u) => u.id !== uploadId));
      } else {
        setItems((prev) => prev.filter((u) => u.id !== uploadId));
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!ignore) await loadPersisted();
    })();
    return () => { ignore = true; };
  }, [fileId]);

  return (
    <section className="rounded-xl border bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        Mortgage
        {sectionAccepted ? (
          <span className="text-xs rounded-full border px-2 py-0.5 text-green-700 border-green-300 bg-green-50">Accepted</span>
        ) : hasAnyUploads ? (
          <span className="text-xs rounded-full border px-2 py-0.5 text-amber-700 border-amber-300 bg-amber-50">In progress</span>
        ) : null}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Guidance (light for now; we'll mirror Figma copy when we add analysis) */}
        <div className="text-sm text-gray-700 space-y-2">
          <p className="font-medium">Required evidence</p>
          <ul className="list-disc ml-5">
            <li><span className="font-medium">Official Mortgage Offer Letter</span> showing borrower name, property address, loan amount, date, and lender details</li>
          </ul>
          <p className="my-1 text-xs text-gray-500">OR</p>
          <ul className="list-disc ml-5">
            <li><span className="font-medium">Agreement in Principle</span> confirming terms and acceptance</li>
          </ul>
          <p className="mt-2 text-xs text-gray-600">
            Documents must be legible, dated (≤ 3 months), show client name &amp; lender, and be from a regulated lender.
          </p>
        </div>

        {/* Upload box */}
        <div className="border rounded-lg p-4">
          <UploadWidget
            fileId={fileId}
            sourceKey="MORTGAGE"
            category="Mortgage Evidence"
            onUploaded={async (u) => {
              setItems((prev) => [u as LocalUpload, ...prev]);
              try {
                await fetch("/api/uploads/analyse", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fileId, uploadId: (u as any).id }),
                });
                await loadPersisted();
                setItems((prev) => prev.filter((x) => x.id !== (u as any).id));
              } catch (e) {
                console.error("Analyse call failed", e);
              }
            }}
          />
        </div>
      </div>

      {/* Analysis placeholder — will show acceptance/reasons after OCR step */}
      <div className="mt-3 border rounded p-3 text-sm">
        <div className="font-medium mb-1">Analysis</div>
        {(!loading && (persisted.length > 0 || items.length > 0)) ? (
          <ul className="mt-1 space-y-1 text-sm text-gray-700">
            {persisted.map((u) => (
              <li key={u.id} className="flex flex-col">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{u.filename}</span>
                  {u.analysis?.status === "CHECKING" && (
                    <span className="text-xs rounded-full border px-2 py-0.5 text-gray-600">Checking…</span>
                  )}
                  {u.analysis?.status === "ACCEPTED" && (
                    <span className="text-xs rounded-full border px-2 py-0.5 text-green-700 border-green-300 bg-green-50">Accepted</span>
                  )}
                  {u.analysis?.status === "REJECTED" && (
                    <span className="text-xs rounded-full border px-2 py-0.5 text-red-700 border-red-300 bg-red-50">Not accepted</span>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {(u.size / 1024 / 1024).toFixed(2)} MB • {u.mime}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove upload"
                      title="Remove"
                      onClick={() => handleRemove(u.id, "persisted")}
                      className="h-6 w-6 rounded-full border text-xs leading-5 text-gray-600 hover:bg-red-50 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {u.analysis?.status === "REJECTED" && u.analysis?.reasons?.length > 0 && (
                  <ul className="ml-6 list-disc text-xs text-red-600">
                    {u.analysis.reasons.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {items.map((u) => (
              <li key={u.id} className="flex flex-col">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{u.filename}</span>
                  {u.analysis?.status === "CHECKING" && (
                    <span className="text-xs rounded-full border px-2 py-0.5 text-gray-600">Checking…</span>
                  )}
                  {u.analysis?.status === "ACCEPTED" && (
                    <span className="text-xs rounded-full border px-2 py-0.5 text-green-700 border-green-300 bg-green-50">Accepted</span>
                  )}
                  {u.analysis?.status === "REJECTED" && (
                    <span className="text-xs rounded-full border px-2 py-0.5 text-red-700 border-red-300 bg-red-50">Not accepted</span>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {(u.size / 1024 / 1024).toFixed(2)} MB • {u.mime}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove upload"
                      title="Remove"
                      onClick={() => handleRemove(u.id, "session")}
                      className="h-6 w-6 rounded-full border text-xs leading-5 text-gray-600 hover:bg-red-50 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {u.analysis?.status === "REJECTED" && u.analysis?.reasons?.length > 0 && (
                  <ul className="ml-6 list-disc text-xs text-red-600">
                    {u.analysis.reasons.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-600">No documents uploaded yet.</div>
        )}
        {loadError && <p className="mt-2 text-xs text-red-600">{loadError}</p>}
      </div>
    </section>
  );
}

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
};

export default function SavingsSection({ fileId }: Props) {
  const [items, setItems] = useState<LocalUpload[]>([]);
  const [persisted, setPersisted] = useState<LocalUpload[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/client/transaction?fileId=${fileId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load uploads");
        const td = data?.file?.transactionDetails || {};
        const all = Array.isArray(td.uploads) ? td.uploads : [];
        const mine = all.filter((u: any) => u?.sourceKey === "SAVINGS");
        if (!ignore) setPersisted(mine as LocalUpload[]);
      } catch (e: any) {
        if (!ignore) setLoadError("Could not load existing uploads.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [fileId]);

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

  return (
    <section className="rounded-xl border bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold">Savings</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Guidance text */}
        <div className="text-sm text-gray-700 space-y-2">
          <p className="font-medium">Required evidence</p>
          <ul className="list-disc ml-5">
            <li>Recent bank statement(s) for the account holding funds</li>
            <li className="ml-5">Must show client name, bank name, and statement date (≤ 3 months)</li>
          </ul>
          <p className="mt-2 text-xs text-gray-600">
            Statement must evidence at least the declared savings amount and be legible.
          </p>
        </div>

        {/* Upload box */}
        <div className="border rounded-lg p-4">
          <UploadWidget
            fileId={fileId}
            sourceKey="SAVINGS"
            category="Savings Statement"
            onUploaded={(u) => setItems((prev) => [u as LocalUpload, ...prev])}
          />

          {/* Persisted uploads list */}
          {!loading && persisted.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium">Uploaded</p>
              <ul className="mt-1 space-y-1 text-sm text-gray-700">
                {persisted.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{u.filename}</span>
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
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loadError && <p className="mt-2 text-xs text-red-600">{loadError}</p>}

          {/* Simple list for this session */}
          {items.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium">Uploaded (this session)</p>
              <ul className="mt-1 space-y-1 text-sm text-gray-700">
                {items.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{u.filename}</span>
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
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Analysis placeholder */}
      <div className="mt-3 border rounded p-3 text-sm">
        <div className="font-medium mb-1">Analysis</div>
        <div className="text-gray-600">No documents uploaded yet.</div>
      </div>
    </section>
  );
}

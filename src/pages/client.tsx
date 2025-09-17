import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type Firm = { id: string; name: string };
type File = { id: string; clientDisplayName: string; fileRef: string | null };

export default function ClientLanding() {
  const router = useRouter();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFirm, setSelectedFirm] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [directId, setDirectId] = useState("");

  // Load firms
  useEffect(() => {
    fetch("/api/firms")
      .then((res) => res.json())
      .then((data) => setFirms(data.firms ?? []))
      .catch(console.error);
  }, []);

  // Load files when firm selected
  useEffect(() => {
    if (!selectedFirm) return;
    fetch(`/api/files?firmId=${selectedFirm}`)
      .then((res) => res.json())
      .then((data) => setFiles(data.files ?? []))
      .catch(console.error);
  }, [selectedFirm]);

  function goToFile(fileId: string) {
    if (fileId) router.push(`/client/files/${fileId}`);
  }

  return (
    <main className="min-h-screen p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Client Portal</h1>

      {/* Firm picker */}
      <div>
        <label className="block text-sm font-medium mb-1">Select Firm</label>
        <select
          value={selectedFirm}
          onChange={(e) => setSelectedFirm(e.target.value)}
          className="w-full rounded border px-3 py-2"
        >
          <option value="">-- choose firm --</option>
          {firms.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* File picker */}
      {selectedFirm && (
        <div>
          <label className="block text-sm font-medium mb-1">Select File</label>
          <select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="w-full rounded border px-3 py-2"
          >
            <option value="">-- choose file --</option>
            {files.map((file) => (
              <option key={file.id} value={file.id}>
                {file.clientDisplayName} {file.fileRef ? `(${file.fileRef})` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={() => goToFile(selectedFile)}
            disabled={!selectedFile}
            className="mt-2 rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {/* Direct File ID input */}
      <div>
        <label className="block text-sm font-medium mb-1">Or enter File ID directly</label>
        <input
          type="text"
          value={directId}
          onChange={(e) => setDirectId(e.target.value)}
          placeholder="Paste File ID..."
          className="w-full rounded border px-3 py-2"
        />
        <button
          onClick={() => goToFile(directId)}
          disabled={!directId}
          className="mt-2 rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          Go
        </button>
      </div>
    </main>
  );
}

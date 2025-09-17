import { useRef, useState } from "react";

type SourceKey = "MORTGAGE" | "SAVINGS";

type Props = {
  fileId: string;
  sourceKey: SourceKey;
  category?: string | null;
  onUploaded?: (upload: {
    id: string;
    filename: string;
    size: number;
    mime: string;
    uploadedAt: string;
    sourceKey: SourceKey;
    category: string | null;
  }) => void;
};

export default function UploadWidget({ fileId, sourceKey, category = null, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Send metadata only (we will wire presigned upload tomorrow)
      const res = await fetch("/api/uploads/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          sourceKey,
          category,
          filename: file.name,
          size: file.size,
          mime: file.type || "application/octet-stream",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to save upload metadata.");
        return;
      }
      setLastFileName(file.name);
      if (onUploaded) {
        onUploaded(data.upload);
      }
      // Clear the input so the same file can be selected again if needed
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Add a document</label>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.heic,application/pdf,image/jpeg,image/png,image/heic"
        onChange={handleFileChange}
        disabled={uploading}
        ref={inputRef}
        className="block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border file:px-3 file:py-1.5 file:text-sm file:bg-white file:border-gray-300 hover:file:bg-gray-50 disabled:opacity-50"
      />
      {uploading && <p className="text-xs text-gray-500">Saving metadata…</p>}
      {lastFileName && !error && (
        <p className="text-xs text-green-700">Saved metadata: {lastFileName}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

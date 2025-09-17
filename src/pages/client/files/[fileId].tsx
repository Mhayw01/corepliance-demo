import type { GetServerSideProps } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";

type FileView = {
  id: string;
  clientDisplayName: string;
  fileRef: string | null;
  caseType: "BUY" | "SELL" | "REMORTGAGE" | "BUY_SELL";
  clientDetails: unknown | null;
  transactionDetails?: any | null;
  firm?: { name: string };
};

type Props = {
  file: FileView | null;
};

export default function ClientFileDashboard({ file }: Props) {
  if (!file) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-red-600">File not found.</p>
        <Link href="/client" className="text-blue-600 underline mt-2 inline-block">← Back to Client landing</Link>
      </main>
    );
  }

  const pdDone = !!file.clientDetails;
  const td = (file.transactionDetails ?? {}) as any;
  const answers = td.answers ?? {};
  const derived = td.derived ?? {};
  const uploads = Array.isArray(td.uploads) ? td.uploads : [];
  const uploadsCompleted = derived.uploadsCompleted === true;
  const uploadsHasData = uploads.length > 0;
  const uploadsStatusText = uploadsCompleted ? "Completed" : uploadsHasData ? "In progress" : "To do";
  const uploadsStatusClass = uploadsCompleted
    ? "bg-green-50 border-green-300 text-green-700"
    : uploadsHasData
    ? "bg-amber-50 border-amber-300 text-amber-700"
    : "";
  const txCompleted = derived.transactionCompleted === true;
  const txHasData = Object.keys(answers).length > 0;
  const txStatusText = txCompleted ? "Completed" : txHasData ? "In progress" : "To do";
  const txStatusClass = txCompleted
    ? "bg-green-50 border-green-300 text-green-700"
    : txHasData
    ? "bg-amber-50 border-amber-300 text-amber-700"
    : "";

  return (
    <main className="min-h-screen p-8 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Client Dashboard - {file.firm?.name ?? "Firm"}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {file.clientDisplayName} • {file.caseType.replace("_", " & ")}
            {file.fileRef ? <> • Ref: <span className="font-medium">{file.fileRef}</span></> : null}
          </p>
        </div>
        <Link href="/client" className="text-sm text-blue-600 underline">← Choose another file</Link>
      </header>

      {/* Task cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Details */}
        <Link href={`/client/files/${file.id}/personal`} className="rounded-xl border bg-white p-5 hover:bg-gray-50 transition">
          <div className="flex items-center justify-between">
            <div className="font-medium">Personal Details</div>
            <span className={`text-xs rounded-full border px-2 py-1 ${pdDone ? "bg-green-50 border-green-300 text-green-700" : ""}`}>
              {pdDone ? "Completed" : "To do"}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Tell us about you (name, contact, address, etc.).</p>
        </Link>

        {/* Transaction Details (type-specific) */}
        <Link href={`/client/files/${file.id}/transaction`} className="rounded-xl border bg-white p-5 hover:bg-gray-50 transition">
          <div className="flex items-center justify-between">
            <div className="font-medium">Transaction Details</div>
            <span className={`text-xs rounded-full border px-2 py-1 ${txStatusClass}`}>{txStatusText}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Questions tailored to your file type ({file.caseType.toLowerCase()}).</p>
        </Link>

        {/* Upload Documents */}
        <Link href={`/client/files/${file.id}/uploads`} className="rounded-xl border bg-white p-5 hover:bg-gray-50 transition">
          <div className="flex items-center justify-between">
            <div className="font-medium">Upload Documents</div>
            <span className={`text-xs rounded-full border px-2 py-1 ${uploadsStatusClass}`}>{uploadsStatusText}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Add the documents we’ll need (proof of ID, address, etc.).</p>
        </Link>

        {/* Identity Check (placeholder) */}
        <Link href={`/client/files/${file.id}/identity`} className="rounded-xl border bg-white p-5 hover:bg-gray-50 transition">
          <div className="flex items-center justify-between">
            <div className="font-medium">Identity Check</div>
            <span className="text-xs rounded-full border px-2 py-1">Coming soon</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">We’ll guide you through a simple identity check.</p>
        </Link>
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const fileId = ctx.params?.fileId as string | undefined;
  if (!fileId) return { props: { file: null } };

  try {
    const f = await prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        clientDisplayName: true,
        fileRef: true,
        caseType: true,
        clientDetails: true,
        transactionDetails: true,
        firm: {
          select: { name: true }
        }
      },
    });
    if (!f) return { props: { file: null } };
    return { props: { file: f } };
  } catch (e) {
    console.error("SSR load file error:", e);
    return { props: { file: null } };
  }
};

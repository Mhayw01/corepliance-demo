import type { GetServerSideProps } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import SummaryBar from "@/components/uploads/SummaryBar";
import MortgageSection from "@/components/uploads/MortgageSection";
import SavingsSection from "@/components/uploads/SavingsSection";
import { useState } from "react";

type Props = {
  file: {
    id: string;
    firm: { name: string } | null;
    transactionDetails: any | null;
  } | null;
};

export default function UploadsPage({ file }: Props) {
  if (!file) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-red-600">File not found.</p>
        <Link href="/client" className="text-blue-600 underline mt-2 inline-block">← Back to Client landing</Link>
      </main>
    );
  }

  const fileId = file.id;

  const td = file.transactionDetails || {};
  const answers = td.answers || {};
  const derived = td.derived || {};

  const hasMortgage: boolean = !!answers.hasMortgage;
  const fundingSources: string[] = Array.isArray(answers.fundingSources) ? answers.fundingSources : [];

  const balanceRequired: number = typeof answers.balanceRequired === "number" ? answers.balanceRequired : 0;
  const fundingTotal: number = typeof derived.fundingTotal === "number" ? derived.fundingTotal : 0;

  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<string[]>([]);

  async function handleFinish() {
    setFinishing(true);
    setFinishError(null);
    setChecklist([]);
    try {
      // Re-fetch latest transaction details to avoid stale state
      const res = await fetch(`/api/client/transaction?fileId=${fileId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load latest status");

      const tdFresh = data?.file?.transactionDetails || {};
      const answersFresh = tdFresh.answers || {};
      const uploadsFresh: any[] = Array.isArray(tdFresh.uploads) ? tdFresh.uploads : [];

      const needsMortgage = !!answersFresh.hasMortgage;
      const needsSavings = Array.isArray(answersFresh.fundingSources) && answersFresh.fundingSources.includes("SAVINGS");

      const mortgageAccepted = uploadsFresh.some(u => u?.sourceKey === "MORTGAGE" && u?.analysis?.status === "ACCEPTED");
      const savingsAccepted = uploadsFresh.some(u => u?.sourceKey === "SAVINGS" && u?.analysis?.status === "ACCEPTED");

      const missing: string[] = [];
      if (needsMortgage && !mortgageAccepted) missing.push("Mortgage evidence not accepted yet");
      if (needsSavings && !savingsAccepted) missing.push("Savings evidence not accepted yet");

      if (missing.length > 0) {
        setChecklist(missing);
        setFinishing(false);
        return;
      }

      // Stamp uploadsCompleted for dashboard status
      const stamp = await fetch("/api/client/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          payload: {
            derived: { uploadsCompleted: true },
          },
        }),
      });
      const stampData = await stamp.json();
      if (!stamp.ok) throw new Error(stampData?.error || "Failed to update status");

      // Navigate back to dashboard
      window.location.href = `/client/files/${fileId}`;
    } catch (e: any) {
      setFinishError(e.message || "Unexpected error");
      setFinishing(false);
    }
  }

  return (
    <main className="min-h-screen p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Upload documents — {file.firm?.name ?? "Firm"}</h1>
        </div>
        <Link href={`/client/files/${fileId}`} className="text-sm text-blue-600 underline">← Back to dashboard</Link>
      </header>

      <SummaryBar balanceRequired={balanceRequired} fundingTotal={fundingTotal} />

      {hasMortgage && <MortgageSection fileId={fileId} />}
      {fundingSources.includes("SAVINGS") && <SavingsSection fileId={fileId} />}

      <section className="rounded-xl border bg-white p-4 space-y-3">
        {checklist.length > 0 && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Please complete the following before finishing:</p>
            <ul className="list-disc ml-5 mt-1">
              {checklist.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}
        {finishError && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {finishError}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleFinish}
            disabled={finishing}
            className="rounded bg-black text-white px-5 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {finishing ? "Finishing…" : "Finish & return to dashboard"}
          </button>
        </div>
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const fileId = ctx.params?.fileId as string | undefined;
  if (!fileId) return { props: { file: null } };

  try {
    const raw = await prisma.file.findUnique({
      where: { id: fileId },
      include: { firm: { select: { name: true } } },
    }) as any;
    if (!raw) return { props: { file: null } };
    const safe = {
      id: raw.id as string,
      firm: raw.firm ? { name: String(raw.firm.name) } : null,
      transactionDetails: raw.transactionDetails ?? null,
    };
    return { props: { file: safe } };
  } catch (e) {
    console.error("SSR uploads load error:", e);
    return { props: { file: null } };
  }
};

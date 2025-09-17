import type { GetServerSideProps } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import SummaryBar from "@/components/uploads/SummaryBar";
import MortgageSection from "@/components/uploads/MortgageSection";
import SavingsSection from "@/components/uploads/SavingsSection";

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

  const td = file.transactionDetails || {};
  const answers = td.answers || {};
  const derived = td.derived || {};

  const hasMortgage: boolean = !!answers.hasMortgage;
  const fundingSources: string[] = Array.isArray(answers.fundingSources) ? answers.fundingSources : [];

  const balanceRequired: number = typeof answers.balanceRequired === "number" ? answers.balanceRequired : 0;
  const fundingTotal: number = typeof derived.fundingTotal === "number" ? derived.fundingTotal : 0;

  return (
    <main className="min-h-screen p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Upload documents — {file.firm?.name ?? "Firm"}</h1>
        </div>
        <Link href={`/client/files/${file.id}`} className="text-sm text-blue-600 underline">← Back to dashboard</Link>
      </header>

      <SummaryBar balanceRequired={balanceRequired} fundingTotal={fundingTotal} />

      {hasMortgage && <MortgageSection fileId={file.id} />}
      {fundingSources.includes("SAVINGS") && <SavingsSection fileId={file.id} />}

      {/* Finish / Submit button will validate sections once acceptance logic is wired */}
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

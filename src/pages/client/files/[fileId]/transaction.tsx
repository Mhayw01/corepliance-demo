import type { GetServerSideProps } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import BuyForm from "@/components/transactions/BuyForm";

type Props = {
  file: {
    id: string;
    caseType: "BUY" | "SELL" | "REMORTGAGE" | "BUY_SELL";
    firm?: { name: string };
  } | null;
};

export default function TransactionPage({ file }: Props) {
  if (!file) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-red-600">File not found.</p>
        <Link href="/client" className="text-blue-600 underline mt-2 inline-block">
          ← Back to Client landing
        </Link>
      </main>
    );
  }

  if (file.caseType === "BUY") {
    return <BuyForm file={{ ...file, caseType: "BUY" }} />;
  }

  return (
    <main className="min-h-screen p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Transaction Details — {file.firm?.name ?? "Firm"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">Case Type: {file.caseType}</p>
        </div>
        <Link href={`/client/files/${file.id}`} className="text-sm text-blue-600 underline">
          ← Back to dashboard
        </Link>
      </header>
      <section className="rounded-xl border bg-white p-6">
        <p className="text-gray-700">
          Transaction form for {file.caseType} will be implemented in the next slices.
        </p>
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
        caseType: true,
        firm: { select: { name: true } },
      },
    });
    if (!f) return { props: { file: null } };
    return { props: { file: f } };
  } catch (e) {
    console.error("SSR transaction load error:", e);
    return { props: { file: null } };
  }
};

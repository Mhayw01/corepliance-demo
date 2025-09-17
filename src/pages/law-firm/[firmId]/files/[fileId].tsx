import type { GetServerSideProps } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";

type Props = {
  file: { id: string; clientDisplayName: string } | null;
};

export default function FilePage({ file }: Props) {
  if (!file) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-red-600">File not found.</p>
        <Link href="/law-firm" className="text-blue-600 underline mt-2 inline-block">
          ← Back to Firms
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">File: {file.clientDisplayName}</h1>
        <Link href="/law-firm" className="text-sm text-blue-600 underline">← Back</Link>
      </header>
      <p className="text-gray-600">This is a placeholder. We’ll show file details here later.</p>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const fileId = ctx.params?.fileId as string | undefined;
  if (!fileId) return { props: { file: null } };

  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { id: true, clientDisplayName: true },
  });

  return { props: { file } };
};

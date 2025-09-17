import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

/**
 * POST /api/client/giftor
 * body: { fileId: string, giftor: { firstName, middleNames?, lastName, dob, address, email, phone, status? } }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { fileId, giftor } = req.body as {
      fileId?: string;
      giftor?: any;
    };

    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }
    if (!giftor || !giftor.firstName || !giftor.lastName || !giftor.email) {
      return res.status(400).json({ error: "Giftor details incomplete" });
    }

    // Load current transactionDetails
    const current = await prisma.file.findUnique({
      where: { id: fileId },
      select: { transactionDetails: true },
    });
    if (!current) return res.status(404).json({ error: "File not found" });

    const existing = (current.transactionDetails as any) || {};
    const answers = existing.answers || {};
    const giftors: any[] = answers.giftors || [];

    // For demo: just overwrite the first slot
    const newGiftor = {
      ...giftor,
      status: giftor.status || "INVITED",
      invitedAt: new Date().toISOString(),
    };
    giftors[0] = newGiftor;

    const nextJson = {
      ...existing,
      answers: {
        ...answers,
        giftors,
      },
    };

    const updated = await prisma.file.update({
      where: { id: fileId },
      data: { transactionDetails: nextJson as any },
      select: { id: true, transactionDetails: true },
    });

    return res.status(200).json({ ok: true, giftors, file: updated });
  } catch (e) {
    console.error("API /client/giftor error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}

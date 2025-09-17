import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { fileId, details } = req.body ?? {};
    if (!fileId || typeof fileId !== "string") {
      return res.status(400).json({ error: "fileId is required" });
    }
    if (details === undefined || typeof details !== "object") {
      return res.status(400).json({ error: "details (object) is required" });
    }

    const updated = await prisma.file.update({
      where: { id: fileId },
      data: { clientDetails: details as any },
      select: { id: true, clientDetails: true },
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, file: updated });
  } catch (e) {
    console.error("API /api/client/personal error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

/**
 * GET /api/client/transaction?fileId=...
 * POST /api/client/transaction
 *   body: { fileId: string, payload: any, markComplete?: boolean }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const fileId = req.query.fileId as string | undefined;
      if (!fileId) return res.status(400).json({ error: "fileId is required" });
      const file = await prisma.file.findUnique({
        where: { id: fileId },
        select: { id: true, caseType: true, transactionDetails: true },
      });
      if (!file) return res.status(404).json({ error: "File not found" });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ file });
    }

    if (req.method === "POST") {
      const { fileId, payload, markComplete } = (req.body ?? {}) as {
        fileId?: string;
        payload?: any;
        markComplete?: boolean;
      };
      if (!fileId || typeof fileId !== "string") {
        return res.status(400).json({ error: "fileId is required" });
      }
      if (payload === undefined || typeof payload !== "object") {
        return res.status(400).json({ error: "payload (object) is required" });
      }

      // Merge with existing JSON (deep merge of answers, derived, uploads)
      const current = await prisma.file.findUnique({
        where: { id: fileId },
        select: { transactionDetails: true },
      });

      const prev = (current?.transactionDetails ?? {}) as any;
      const nextJson = {
        answers: { ...(prev.answers || {}), ...(payload.answers || {}) },
        derived: { ...(prev.derived || {}), ...(payload.derived || {}) },
        uploads: payload.uploads !== undefined ? payload.uploads : (prev.uploads || []),
      };

      const updated = await prisma.file.update({
        where: { id: fileId },
        data: { transactionDetails: nextJson as any },
        select: { id: true, transactionDetails: true },
      });

      // Optionally mark completed later (validation lives in UI for now)
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, file: updated, completed: !!markComplete });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (e) {
    console.error("API /api/client/transaction error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}

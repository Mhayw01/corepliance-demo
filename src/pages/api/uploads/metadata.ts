import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

/**
 * POST /api/uploads/metadata
 * body: {
 *   fileId: string,
 *   sourceKey: "MORTGAGE" | "SAVINGS",
 *   category?: string,               // e.g., "Mortgage Offer Letter", "Savings Statement"
 *   filename: string,
 *   size: number,
 *   mime: string
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "DELETE") {
      const { fileId, uploadId } = (req.body ?? {}) as { fileId?: string; uploadId?: string };
      if (!fileId || typeof fileId !== "string") {
        res.setHeader("Allow", ["POST", "DELETE"]);
        return res.status(400).json({ error: "fileId is required" });
      }
      if (!uploadId || typeof uploadId !== "string") {
        res.setHeader("Allow", ["POST", "DELETE"]);
        return res.status(400).json({ error: "uploadId is required" });
      }
      const current = (await prisma.file.findUnique({
        where: { id: fileId },
      })) as any;
      if (!current) {
        return res.status(404).json({ error: "File not found" });
      }
      const td = (current.transactionDetails as any) || {};
      const uploads: any[] = Array.isArray(td.uploads) ? td.uploads : [];
      const filtered = uploads.filter((u) => u?.id !== uploadId);
      const nextTd = { ...td, uploads: filtered };
      await prisma.file.update({
        where: { id: fileId },
        data: { transactionDetails: nextTd as any },
      });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, removed: uploadId, transactionDetails: nextTd });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST", "DELETE"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { fileId, sourceKey, category, filename, size, mime } = req.body ?? {};
    if (!fileId || typeof fileId !== "string") return res.status(400).json({ error: "fileId is required" });
    if (!sourceKey || (sourceKey !== "MORTGAGE" && sourceKey !== "SAVINGS")) {
      return res.status(400).json({ error: "sourceKey must be 'MORTGAGE' or 'SAVINGS'" });
    }
    if (!filename || typeof filename !== "string") return res.status(400).json({ error: "filename is required" });
    if (typeof size !== "number" || size < 0) return res.status(400).json({ error: "size must be a number" });
    if (!mime || typeof mime !== "string") return res.status(400).json({ error: "mime is required" });

    // Store metadata in transactionDetails.uploads[] for demo (can be moved to a separate table later)
    const current = (await prisma.file.findUnique({
      where: { id: fileId },
    })) as any;
    if (!current) return res.status(404).json({ error: "File not found" });

    const td = (current.transactionDetails as any) || {};
    const uploads: any[] = Array.isArray(td.uploads) ? td.uploads : [];

    // Minimal normalized shape
    const newItem = {
      id: `upl_${Date.now()}`,     // demo id
      fileId,
      sourceKey,                   // "MORTGAGE" | "SAVINGS"
      category: category || null,
      filename,
      size,
      mime,
      uploadedAt: new Date().toISOString(),
      analysis: null               // to be filled by OCR step
    };
    uploads.push(newItem);

    const nextTd = { ...td, uploads };

    await prisma.file.update({
      where: { id: fileId },
      data: { transactionDetails: nextTd as any },
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, upload: newItem, transactionDetails: nextTd });
  } catch (e) {
    console.error("API /uploads/metadata error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}

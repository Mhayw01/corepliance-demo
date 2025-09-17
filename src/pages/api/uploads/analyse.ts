import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

/**
 * POST /api/uploads/analyse
 * body: { fileId: string, uploadId: string }
 *
 * Demo stub:
 * - Mortgage: ACCEPTED if filename includes "offer" or "aip"
 * - Savings:  ACCEPTED if filename includes "statement"
 * - Otherwise REJECTED with basic reason
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { fileId, uploadId } = (req.body ?? {}) as { fileId?: string; uploadId?: string };
    if (!fileId || typeof fileId !== "string") return res.status(400).json({ error: "fileId is required" });
    if (!uploadId || typeof uploadId !== "string") return res.status(400).json({ error: "uploadId is required" });

    // Load the file record and transactionDetails
    const current = (await prisma.file.findUnique({
      where: { id: fileId },
    })) as any;
    if (!current) return res.status(404).json({ error: "File not found" });

    const td = (current.transactionDetails as any) || {};
    const uploads: any[] = Array.isArray(td.uploads) ? td.uploads : [];
    const idx = uploads.findIndex((u) => u?.id === uploadId);
    if (idx === -1) return res.status(404).json({ error: "Upload not found" });

    const upload = uploads[idx];
    const name = String(upload.filename || "").toLowerCase();
    const sourceKey = String(upload.sourceKey || "");

    // --- Demo "analysis" rules by filename keywords ---
    let passed = false;
    let reasons: string[] = [];
    let docType: string | null = null;
    let confidence = 0.4; // low confidence for stub

    if (sourceKey === "MORTGAGE") {
      if (name.includes("offer")) {
        passed = true;
        docType = "MORTGAGE_OFFER";
        confidence = 0.7;
      } else if (name.includes("aip")) {
        passed = true;
        docType = "AIP";
        confidence = 0.6;
      } else {
        passed = false;
        reasons.push("Unrecognized mortgage document (expected Offer or AIP).");
      }
    } else if (sourceKey === "SAVINGS") {
      if (name.includes("statement")) {
        passed = true;
        docType = "SAVINGS_STATEMENT";
        confidence = 0.6;
      } else {
        passed = false;
        reasons.push("Unrecognized savings document (expected bank statement).");
      }
    } else {
      passed = false;
      reasons.push("Unsupported sourceKey.");
    }

    // Update analysis on this upload
    uploads[idx] = {
      ...upload,
      analysis: {
        status: passed ? "ACCEPTED" : "REJECTED",
        passed,
        reasons,
        docType,
        extracts: {},   // will be filled by real OCR later
        confidence,
        version: new Date().toISOString().slice(0,10),
      },
    };

    const nextTd = { ...td, uploads };

    await prisma.file.update({
      where: { id: fileId },
      data: { transactionDetails: nextTd as any },
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, upload: uploads[idx] });
  } catch (e) {
    console.error("API /uploads/analyse error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}

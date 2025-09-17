import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

// Allowed file types matching the Prisma enum (mapped from CaseType)
const FILE_TYPES = new Set(["BUY", "SELL", "REMORTGAGE", "BUY_SELL"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { firmId } = req.query;
      if (!firmId || typeof firmId !== "string") {
        return res.status(400).json({ error: "firmId is required" });
      }
      const files = await prisma.file.findMany({
        where: { firmId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          clientDisplayName: true,
          clientFirstName: true,
          clientLastName: true,
          clientEmail: true,
          fileRef: true,
          caseType: true, // still named caseType in Prisma model
          status: true,
          createdAt: true,
        },
      });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ files });
    }

    if (req.method === "POST") {
      const { firmId, clientDisplayName, clientFirstName, clientLastName, clientEmail, fileType, fileRef } = (req.body ?? {}) as {
        firmId?: string;
        clientDisplayName?: string;
        clientFirstName?: string;
        clientLastName?: string;
        clientEmail?: string;
        fileType?: string;
        fileRef?: string;
      };

      const trimmedName = typeof clientDisplayName === "string" ? clientDisplayName.trim() : "";
      const trimmedFirstName = typeof clientFirstName === "string" ? clientFirstName.trim() : "";
      const trimmedLastName = typeof clientLastName === "string" ? clientLastName.trim() : "";
      let displayName = "";

      if (trimmedName) {
        displayName = trimmedName;
      } else {
        displayName = (trimmedFirstName + " " + trimmedLastName).trim();
      }

      if (!firmId || typeof firmId !== "string") return res.status(400).json({ error: "firmId is required" });
      if (!displayName) return res.status(400).json({ error: "clientDisplayName or clientFirstName/clientLastName is required" });
      if (clientEmail !== undefined && typeof clientEmail !== "string")
        return res.status(400).json({ error: "clientEmail must be a string if provided" });
      if (!fileType || typeof fileType !== "string" || !FILE_TYPES.has(fileType)) {
        return res
          .status(400)
          .json({ error: "fileType must be one of BUY, SELL, REMORTGAGE, BUY_SELL" });
      }

      const created = await prisma.file.create({
        data: {
          firmId,
          clientDisplayName: displayName,
          clientFirstName: trimmedFirstName || null,
          clientLastName: trimmedLastName || null,
          clientEmail,
          fileRef,
          caseType: fileType as any, // Prisma field is caseType (enum FileType)
        },
        select: {
          id: true,
          clientDisplayName: true,
          clientFirstName: true,
          clientLastName: true,
          clientEmail: true,
          fileRef: true,
          caseType: true,
          status: true,
          createdAt: true,
        },
      });

      res.setHeader("Cache-Control", "no-store");
      return res.status(201).json({ file: created });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "id is required" });
      }
      try {
        const deleted = await prisma.file.delete({ where: { id } });
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).json({ ok: true, id: deleted.id });
      } catch (e) {
        return res.status(404).json({ error: "file not found" });
      }
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (err) {
    console.error("API /api/files error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

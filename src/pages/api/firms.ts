import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      // List firms (newest first by id for now)
      const firms = await prisma.firm.findMany({
        orderBy: { id: "desc" },
        select: { id: true, name: true },
      });
      return res.status(200).json({ firms });
    }

    if (req.method === "POST") {
      const { name } = req.body ?? {};
      const trimmed = typeof name === "string" ? name.trim() : "";
      if (!trimmed) return res.status(400).json({ error: "Firm name is required" });

      const firm = await prisma.firm.create({
        data: { name: trimmed },
        select: { id: true, name: true },
      });
      return res.status(201).json({ firm });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (err: any) {
    console.error("API /api/firms error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

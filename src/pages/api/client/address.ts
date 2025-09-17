import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const term = req.query.term as string;
    if (!term) return res.status(400).json({ error: "term is required" });

    const apiKey = process.env.GETADDRESS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API key not configured" });

    const url = new URL(`https://api.getAddress.io/autocomplete/${encodeURIComponent(term)}`);
    url.searchParams.set("api-key", apiKey);
    const response = await fetch(url.toString());
    const data = await response.json();

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch (e) {
    console.error("Address API error:", e);
    return res.status(500).json({ error: "Failed to fetch suggestions" });
  }
}

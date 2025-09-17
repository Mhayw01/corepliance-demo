// SDLT / LTT calculator (Apr 2025)
// Usage:
//   import { calcPropertyTax } from "@/utils/calcPropertyTax";
//   const { total, breakdown, version, regime } = calcPropertyTax({ country:"ENGLAND", price: 450000, isFirstTimeBuyer:true, isAdditionalDwelling:false, isNonUKResident:false });

export type TaxCountry = "ENGLAND" | "WALES";

export type TaxInput = {
  country: TaxCountry;
  price: number;
  isFirstTimeBuyer?: boolean;     // England only
  isAdditionalDwelling?: boolean; // England + Wales (second home/BTL)
  isNonUKResident?: boolean;      // England only
  // isCompanyPurchase?: boolean;  // deferred for now
};

export type TaxSlice = {
  bandLabel: string;   // e.g., "£0–125,000 @ 0%"
  rate: number;        // decimal (e.g., 0.05)
  sliceAmount: number; // portion of price taxed in this band
  tax: number;         // tax for this slice
};

export type TaxOutput = {
  total: number;          // total tax (£)
  breakdown: TaxSlice[];  // per-band breakdown (including surcharges)
  version: string;        // e.g., "2025-04"
  regime: "SDLT" | "LTT"; // which rules applied
};

const VERSION = "2025-04";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatBandLabel(lower: number, upper: number | null, baseRatePercent: number, surchargesPercent: number): string {
  const upperText = upper === null ? "+" : `–${upper.toLocaleString("en-GB")}`;
  const totalRatePercent = baseRatePercent + surchargesPercent;
  return `£${lower.toLocaleString("en-GB")}${upperText} @ ${totalRatePercent}%`;
}

function sliceBands(price: number, thresholds: number[], rates: number[], surcharge: number): TaxSlice[] {
  // thresholds: ascending band starts, e.g. [0, 125000, 250000, ...]
  // rates: base rates per band (decimal), length == thresholds.length - 1 (last band implicit Infinity)
  const slices: TaxSlice[] = [];
  const bandCount = thresholds.length;

  for (let i = 0; i < bandCount; i++) {
    const lower = thresholds[i];
    const upper = i + 1 < bandCount ? thresholds[i + 1] - 1 : Number.POSITIVE_INFINITY;
    if (price <= lower) break;

    const sliceAmount = Math.max(0, Math.min(price, upper) - lower + 1); // inclusive thresholds
    if (sliceAmount <= 0) continue;

    const baseRate = rates[i] ?? rates[rates.length - 1] ?? 0;
    const totalRate = baseRate + surcharge;
    const tax = round2(sliceAmount * totalRate);

    const baseRatePercent = Math.round(baseRate * 100 * 100) / 100;
    const surchargePercent = Math.round(surcharge * 100 * 100) / 100;

    slices.push({
      bandLabel: formatBandLabel(lower, upper === Number.POSITIVE_INFINITY ? null : upper, baseRatePercent, surchargePercent),
      rate: round2(totalRate),
      sliceAmount: sliceAmount,
      tax,
    });

    if (price <= upper) break;
  }

  return slices;
}

export function calcPropertyTax(input: TaxInput): TaxOutput {
  const { country, price, isFirstTimeBuyer, isAdditionalDwelling, isNonUKResident } = input;

  if (!price || price <= 0) {
    return { total: 0, breakdown: [], version: VERSION, regime: country === "WALES" ? "LTT" : "SDLT" };
  }

  if (country === "WALES") {
    // LTT (Wales) — residential
    // Bands (residential):
    // 0–225k → 0%
    // 225,001–400k → 6%
    // 400,001–750k → 7.5%
    // 750,001–1.5m → 10%
    // 1.5m+ → 12%
    // Additional property surcharge: +4% on all slices. No FTB relief.
    const thresholds = [0, 225_000 + 1, 400_000 + 1, 750_000 + 1, 1_500_000 + 1];
    const rates = [0, 0.06, 0.075, 0.10, 0.12]; // base rates per band
    const surcharge = isAdditionalDwelling ? 0.04 : 0;

    const breakdown = sliceBands(price, thresholds, rates, surcharge);
    const total = round2(breakdown.reduce((sum, s) => sum + s.tax, 0));
    return { total, breakdown, version: VERSION, regime: "LTT" };
  }

  // ENGLAND & NI — SDLT (residential)
  // Bands (base):
  // 0–125k → 0%
  // 125,001–250k → 2%
  // 250,001–925k → 5%
  // 925,001–1.5m → 10%
  // 1.5m+ → 12%
  //
  // Reliefs & surcharges:
  // - First-time buyer relief: 0% to £300k, 5% on £300–500k, if all buyers FTB and price <= £500k.
  // - Additional dwellings: +5% on all slices.
  // - Non-UK resident: +2% on all slices.
  //
  // Note: surcharges apply even to the 0% band.
  //
  // Company purchase path: deferred.

  // Base thresholds/rates
  let thresholds = [0, 125_000 + 1, 250_000 + 1, 925_000 + 1, 1_500_000 + 1];
  let rates = [0, 0.02, 0.05, 0.10, 0.12];

  // First-time buyer relief (only if price <= 500k and flag true)
  if (isFirstTimeBuyer && price <= 500_000) {
    // 0% to 300k, 5% on 300–500k
    thresholds = [0, 300_000 + 1, 500_000 + 1];
    rates = [0, 0.05, 0.05]; // beyond 500k shouldn't be hit as price <= 500k
  }

  // Surcharges
  const addl = isAdditionalDwelling ? 0.05 : 0;
  const nonUk = isNonUKResident ? 0.02 : 0;
  const surcharge = addl + nonUk;

  const breakdown = sliceBands(price, thresholds, rates, surcharge);
  const total = round2(breakdown.reduce((sum, s) => sum + s.tax, 0));
  return { total, breakdown, version: VERSION, regime: "SDLT" };
}

export default calcPropertyTax;

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { calcPropertyTax, type TaxCountry } from "@/utils/calcPropertyTax";

// Starter lender list for demo
const LENDER_LIST = [
  "Halifax","NatWest","Santander","Nationwide","Barclays","HSBC","Lloyds","TSB",
  "Virgin Money","Skipton","Yorkshire Building Society","Other",
];

// Funding source keys
const FUNDING_OPTIONS = [
  { key: "SAVINGS", label: "Savings" },
  { key: "SALE_OF_PROPERTY", label: "Sale of Property" },
  { key: "GIFT", label: "Gifted Deposit" },
  { key: "PENSION_LUMP_SUM", label: "Lump sum from Pension" },
  { key: "SALE_OF_SHARES", label: "Sale of Shares" },
  { key: "INHERITANCE", label: "Inheritance" },
  { key: "COMPENSATION", label: "Compensation Payment" },
  { key: "DIVORCE_SETTLEMENT", label: "Divorce Settlement" },
  { key: "OTHER", label: "Other" },
] as const;
type FundingKey = typeof FUNDING_OPTIONS[number]["key"];

type BuyFormProps = {
  file: {
    id: string;
    caseType: "BUY";
    firm?: { name: string };
  };
};

export default function BuyForm({ file }: BuyFormProps) {
  const router = useRouter();
  const fileId = file.id;

  // ---------------- BUY form state ----------------
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [propertyAddress, setPropertyAddress] = useState("");
  const [addressQuery, setAddressQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [propertyType, setPropertyType] = useState<"HOUSE" | "APARTMENT" | "">("");
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [hasMortgage, setHasMortgage] = useState<null | boolean>(null);
  const [amountBorrowing, setAmountBorrowing] = useState<string>("");
  const [lender, setLender] = useState<string>("");
  const [lenderOther, setLenderOther] = useState<string>("");
  const [fundingSources, setFundingSources] = useState<FundingKey[]>([]);
  const [fundingAmounts, setFundingAmounts] = useState<Partial<Record<FundingKey, string>>>({});
  const [country, setCountry] = useState<TaxCountry | null>(null);
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState<boolean>(false);
  const [isAdditionalDwelling, setIsAdditionalDwelling] = useState<boolean>(false);
  const [isNonUKResident, setIsNonUKResident] = useState<boolean>(false);
  const [sdltTotal, setSdltTotal] = useState<number | null>(null);
  const [sdltBreakdown, setSdltBreakdown] = useState<{ bandLabel: string; rate: number; sliceAmount: number; tax: number; }[]>([]);
  const [calcVersion, setCalcVersion] = useState<string | null>(null);

  // Load existing details
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/client/transaction?fileId=${fileId}`);
        if (!res.ok) throw new Error("Failed to load transaction details");
        const data = await res.json();
        const td = data?.file?.transactionDetails?.answers ?? {};
        if (!ignore) {
          setPropertyAddress(td.propertyAddress ?? "");
          setAddressQuery(td.propertyAddress ?? "");
          setPropertyType(td.propertyType ?? "");
          setPurchasePrice(td.purchasePrice != null ? String(td.purchasePrice) : "");
          setHasMortgage(typeof td.hasMortgage === "boolean" ? td.hasMortgage : null);
          setAmountBorrowing(td.amountBorrowing != null ? String(td.amountBorrowing) : "");
          setLender(td.lender ?? "");
          setLenderOther(td.lenderOther ?? "");
          setFundingSources(Array.isArray(td.fundingSources) ? td.fundingSources : []);
          // Restore saved funding amounts (numeric map -> string map for inputs)
          const savedFA = td.fundingAmounts || {};
          const restoredFA: Partial<Record<FundingKey, string>> = {};
          Object.keys(savedFA).forEach((k) => {
            try {
              restoredFA[k as FundingKey] = String(savedFA[k]);
            } catch {
              // ignore malformed keys
            }
          });
          setFundingAmounts(restoredFA);
          setCountry(td.country ?? null);
          setIsFirstTimeBuyer(!!td.isFirstTimeBuyer);
          setIsAdditionalDwelling(!!td.isAdditionalDwelling);
          setIsNonUKResident(!!td.isNonUKResident);
          setSdltTotal(typeof td.sdltTotal === "number" ? td.sdltTotal : null);
          const derived = data?.file?.transactionDetails?.derived || {};
          setSdltBreakdown(Array.isArray(derived.sdltBreakdown) ? derived.sdltBreakdown : []);
          setCalcVersion(typeof derived.calcVersion === "string" ? derived.calcVersion : null);
        }
      } catch (e: any) {
        console.error(e);
        if (!ignore) setError("Could not load saved data.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [fileId]);

  async function handleAddressChange(val: string) {
    setAddressQuery(val);
    // Do not immediately overwrite the saved address; we keep it in propertyAddress only on select.
    const q = val.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/client/address?term=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (Array.isArray(data?.suggestions)) {
        const items = data.suggestions
          .map((s: any) => s.address || s.text || "")
          .filter((x: string) => !!x);
        setSuggestions(items);
      } else {
        setSuggestions([]);
      }
    } catch (e) {
      console.error(e);
      setSuggestions([]);
    }
  }

  // Shallow save helper
  async function savePartial(payload: Record<string, any>) {
    setSaving(true);
    setSavedTick(false);
    try {
      const res = await fetch("/api/client/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          payload: { answers: payload, type: "BUY", version: "v1" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1200);
    } catch (e) {
      console.error(e);
      setError("Save failed, please try again.");
    } finally {
      setSaving(false);
    }
  }

  function deriveCountryFromAddress(addr: string): TaxCountry | null {
    const upper = addr.toUpperCase();
    if (upper.includes(" WALES")) return "WALES";
    const m = upper.match(/([A-Z]{1,2}\d{1,2}[A-Z]?)\s*\d[A-Z]{2}\b/);
    const oc = m ? m[1] : "";
    if (oc.startsWith("CF") || oc.startsWith("LL") || oc.startsWith("SA") || oc.startsWith("LD")) return "WALES";
    return "ENGLAND";
  }

  // Derived (placeholder until you give rules)
  const calcSummary = useMemo(() => {
    const price = Number(purchasePrice || 0);
    const advance = hasMortgage ? Number(amountBorrowing || 0) : 0;
    const tax = Number(sdltTotal || 0);
    const balance = Math.max(0, price + tax - advance);
    return { price, tax, advance, balance };
  }, [purchasePrice, sdltTotal, amountBorrowing, hasMortgage]);

  const includesGift = useMemo(
    () => fundingSources.includes("GIFT"),
    [fundingSources]
  );

  // Toggle multi-select funding, with amounts sync
  function toggleFunding(key: FundingKey) {
    setFundingSources((prev) => {
      const exists = prev.includes(key);
      const next = exists ? prev.filter((k) => k !== key) : [...prev, key];
      // Maintain amounts map in sync
      setFundingAmounts((m) => {
        const copy = { ...m };
        if (exists) {
          delete copy[key];
        } else if (!(key in copy)) {
          copy[key] = "";
        }
        return copy;
      });
      void savePartial({ fundingSources: next });
      return next;
    });
  }

  // Helper to compute total of funding amounts
  function computeFundingTotal(amts: Partial<Record<FundingKey, string>>, active: FundingKey[]): number {
    return active.reduce((sum, k) => {
      const v = Number((amts[k] || "").replace(/[, ]/g, ""));
      return sum + (isFinite(v) ? v : 0);
    }, 0);
  }

  async function handleNext() {
    // Compute numeric funding amounts and final total
    const numericFundingAmounts = Object.fromEntries(
      fundingSources.map((k) => [
        k,
        Number(String(fundingAmounts[k] ?? "").replace(/[, ]/g, "")) || 0,
      ])
    ) as Record<FundingKey, number>;
    const finalFundingTotal = fundingSources.reduce(
      (sum, k) => sum + (numericFundingAmounts[k] || 0),
      0
    );
    const balance = Number(calcSummary.balance || 0);
    const diff = Math.round((balance - finalFundingTotal) * 100) / 100;
    // Block if sources don't match the required balance (per agreed rule)
    if (balance > 0 && diff !== 0) {
      setError(
        diff > 0
          ? `Please match your sources to the balance (short by £${diff.toLocaleString("en-GB")}).`
          : `Please match your sources to the balance (over by £${Math.abs(diff).toLocaleString("en-GB")}).`
      );
      return;
    }
    // Build comprehensive answers snapshot
    const allAnswers = {
      propertyAddress,
      propertyType,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      sdltTotal: sdltTotal != null ? sdltTotal : null,
      hasMortgage,
      amountBorrowing: amountBorrowing ? Number(amountBorrowing) : null,
      lender,
      lenderOther: lender === "Other" ? lenderOther : "",
      country,
      isFirstTimeBuyer,
      isAdditionalDwelling,
      isNonUKResident,
      balanceRequired: balance,
      fundingSources,
      fundingAmounts: numericFundingAmounts,
    };
    // Single authoritative save BEFORE navigating
    setSaving(true);
    setSavedTick(false);
    try {
      const res = await fetch("/api/client/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          payload: {
            answers: allAnswers,
            derived: { fundingTotal: finalFundingTotal, transactionCompleted: true },
            type: "BUY",
            version: "v1",
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Save failed");
        setSaving(false);
        return;
      }
      setSavedTick(true);
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
      setSaving(false);
      return;
    } finally {
      setSaving(false);
    }
    // Route according to Gifted Deposit
    if (includesGift) {
      router.push(`/client/files/${fileId}/giftor-invite`);
    } else {
      router.push(`/client/files/${fileId}/uploads`);
    }
  }

  useEffect(() => {
    const price = Number(purchasePrice || 0);
    if (!country || !price || price <= 0) {
      setSdltTotal(null);
      setSdltBreakdown([]);
      setCalcVersion(null);
      return;
    }
    const out = calcPropertyTax({
      country,
      price,
      isFirstTimeBuyer,
      isAdditionalDwelling,
      isNonUKResident,
    });
    setSdltTotal(out.total);
    setSdltBreakdown(out.breakdown);
    setCalcVersion(out.version);
    // Persist answers (flags + country + total)
    void savePartial({
      country,
      isFirstTimeBuyer,
      isAdditionalDwelling,
      isNonUKResident,
      sdltTotal: out.total,
    });
    // Persist derived breakdown + version
    void savePartial({
      derived: {
        sdltBreakdown: out.breakdown,
        calcVersion: out.version,
      },
    });
  }, [country, purchasePrice, isFirstTimeBuyer, isAdditionalDwelling, isNonUKResident]);

  useEffect(() => {
    const price = Number(purchasePrice || 0);
    const advance = hasMortgage ? Number(amountBorrowing || 0) : 0;
    const tax = Number(sdltTotal || 0);
    if (!price || price <= 0) return;
    const balance = Math.max(0, price + tax - advance);
    // Save under answers for quick access and also under derived for audit
    void savePartial({ balanceRequired: balance });
    void savePartial({ derived: { balanceCalc: balance } });
  }, [purchasePrice, sdltTotal, amountBorrowing, hasMortgage]);

  return (
    <main className="min-h-screen p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Transaction Details — {file.firm?.name ?? "Firm"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Case Type: {file.caseType}
            {saving && <span className="ml-3 text-xs text-gray-500">Saving…</span>}
            {savedTick && <span className="ml-3 text-xs text-green-600">Saved ✓</span>}
          </p>
        </div>
        <Link href={`/client/files/${fileId}`} className="text-sm text-blue-600 underline">
          ← Back to dashboard
        </Link>
      </header>

      <section className="rounded-xl border bg-white p-6 space-y-6">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Address (postcode-first autocomplete) */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">
                Full address of the property you are purchasing
              </label>
              <input
                type="text"
                value={addressQuery}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="Start typing your postcode (e.g. CF10 1AA)"
                className="mt-1 w-full rounded border px-3 py-2"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded border bg-white shadow">
                  {suggestions.map((s, i) => (
                    <li
                      key={`${s}-${i}`}
                      onClick={() => {
                        setAddressQuery(s);
                        setPropertyAddress(s);
                        setSuggestions([]);
                        const derivedC = deriveCountryFromAddress(s);
                        setCountry(derivedC);
                        void savePartial({ propertyAddress: s, country: derivedC });
                      }}
                      className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Tip: start with your postcode for the best results. Then choose your full address from the list.
              </p>
            </div>

            {/* Property type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Type of Property</label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => { setPropertyType("HOUSE"); void savePartial({ propertyType: "HOUSE" }); }}
                  className={`rounded-full border px-4 py-2 text-sm ${propertyType === "HOUSE" ? "bg-black text-white" : "hover:bg-gray-50"}`}
                >
                  House
                </button>
                <button
                  type="button"
                  onClick={() => { setPropertyType("APARTMENT"); void savePartial({ propertyType: "APARTMENT" }); }}
                  className={`rounded-full border px-4 py-2 text-sm ${propertyType === "APARTMENT" ? "bg-black text-white" : "hover:bg-gray-50"}`}
                >
                  Apartment
                </button>
              </div>
            </div>

            {/* Purchase price & SDLT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    onBlur={() => savePartial({ purchasePrice: purchasePrice ? Number(purchasePrice) : null })}
                    className="mt-1 w-full rounded border px-3 py-2 pl-7"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Stamp Duty / LTT (calculated)</label>
                <div className="rounded border p-3 text-sm text-gray-700">
                  {sdltTotal == null ? (
                    <div>Enter price and flags to calculate.</div>
                  ) : (
                    <>
                      <div className="font-medium">Total: £{sdltTotal.toLocaleString("en-GB")}</div>
                      {sdltBreakdown.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {sdltBreakdown.map((b, i) => (
                            <li key={i} className="text-xs">
                              {b.bandLabel}: £{Math.round(b.tax).toLocaleString("en-GB")}
                            </li>
                          ))}
                        </ul>
                      )}
                      {calcVersion && (
                        <div className="mt-2 text-xs text-gray-500">
                          Based on current bands (v{calcVersion}).
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Buyer Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Buyer Status</label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isAdditionalDwelling}
                    onChange={(e) => { setIsAdditionalDwelling(e.target.checked); void savePartial({ isAdditionalDwelling: e.target.checked }); }}
                  />
                  <span>Additional property / Buy‑to‑let</span>
                </label>
                {country === "ENGLAND" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isFirstTimeBuyer}
                      onChange={(e) => { setIsFirstTimeBuyer(e.target.checked); void savePartial({ isFirstTimeBuyer: e.target.checked }); }}
                    />
                    <span>I/we are first‑time buyers</span>
                  </label>
                )}
                {country === "ENGLAND" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isNonUKResident}
                      onChange={(e) => { setIsNonUKResident(e.target.checked); void savePartial({ isNonUKResident: e.target.checked }); }}
                    />
                    <span>Buyer is non‑UK resident</span>
                  </label>
                )}
                {!country && (
                  <p className="text-xs text-gray-500">
                    Select an address to determine whether SDLT (England/NI) or LTT (Wales) applies.
                  </p>
                )}
              </div>
            </div>

            {/* Mortgage */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Are you getting a Mortgage to fund the purchase?</label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => { setHasMortgage(true); void savePartial({ hasMortgage: true }); }}
                  className={`rounded-full border px-4 py-2 text-sm ${hasMortgage === true ? "bg-black text-white" : "hover:bg-gray-50"}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasMortgage(false);
                    setAmountBorrowing(""); setLender(""); setLenderOther("");
                    void savePartial({ hasMortgage: false, amountBorrowing: null, lender: "", lenderOther: "" });
                  }}
                  className={`rounded-full border px-4 py-2 text-sm ${hasMortgage === false ? "bg-black text-white" : "hover:bg-gray-50"}`}
                >
                  No
                </button>
              </div>
            </div>

            {hasMortgage === true && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">How much are you borrowing?</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                    <input
                      value={amountBorrowing}
                      onChange={(e) => setAmountBorrowing(e.target.value)}
                      onBlur={() => savePartial({ amountBorrowing: amountBorrowing ? Number(amountBorrowing) : null })}
                      className="mt-1 w-full rounded border px-3 py-2 pl-7"
                      inputMode="decimal"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lender</label>
                  <select
                    value={lender || ""}
                    onChange={(e) => { const v = e.target.value; setLender(v); void savePartial({ lender: v }); }}
                    onBlur={() => savePartial({ lender })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  >
                    <option value="">-- Select lender --</option>
                    {LENDER_LIST.map((l) => (<option key={l} value={l}>{l}</option>))}
                  </select>
                  {lender === "Other" && (
                    <input
                      value={lenderOther}
                      onChange={(e) => setLenderOther(e.target.value)}
                      onBlur={() => savePartial({ lenderOther })}
                      placeholder="Type lender"
                      className="mt-2 w-full rounded border px-3 py-2"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Calculation boxes (read-only placeholders) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Your Calculation</label>
                <div className="rounded border p-3 text-sm text-gray-700">
                  <div>Purchase Price: £{calcSummary.price || 0}</div>
                  <div>SDLT/LTT: £{calcSummary.tax || 0}</div>
                  <div>Mortgage advance: £{calcSummary.advance || 0}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Balance</label>
                <div className="rounded border p-3 text-sm text-gray-700">
                  {Number.isFinite(calcSummary.balance) ? `£${(calcSummary.balance ?? 0).toLocaleString("en-GB")}` : "—"}
                </div>
              </div>
            </div>

            {/* Funding sources */}
            <div>
              <label className="block text-sm font-medium text-gray-700">How is the balance being funded?</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {FUNDING_OPTIONS.map((opt) => {
                  const active = fundingSources.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleFunding(opt.key)}
                      className={`rounded-full border px-4 py-2 text-sm ${active ? "bg-black text-white" : "hover:bg-gray-50"}`}
                      aria-pressed={active}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {/* Per-source amounts */}
              {calcSummary.balance === 0 ? (
                <p className="mt-2 text-xs text-gray-500">No funds required (balance is £0).</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {fundingSources.map((k) => (
                    <div key={k} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                      <label className="text-sm">
                        {FUNDING_OPTIONS.find(o => o.key === k)?.label} amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                        <input
                          value={fundingAmounts[k] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFundingAmounts((m) => ({ ...m, [k]: val }));
                          }}
                          onBlur={() => {
                            const total = computeFundingTotal(fundingAmounts, fundingSources);
                            void savePartial({
                              fundingAmounts: Object.fromEntries(
                                Object.entries(fundingAmounts).map(([kk, vv]) => [kk, Number(String(vv).replace(/[, ]/g, "")) || 0])
                              ),
                            });
                            void savePartial({ derived: { fundingTotal: total } });
                          }}
                          inputMode="decimal"
                          placeholder="0"
                          className="w-full rounded border px-3 py-2 pl-7"
                        />
                      </div>
                    </div>
                  ))}
                  {/* Totals & guidance */}
                  <div className="mt-2 text-sm">
                    {(() => {
                      const total = computeFundingTotal(fundingAmounts, fundingSources);
                      const balance = Number(calcSummary.balance || 0);
                      const diff = Math.round((balance - total) * 100) / 100;
                      if (!balance) return null;
                      if (diff === 0) return <span className="text-green-700">✅ Matched: sources equal the required balance (£{balance.toLocaleString("en-GB")}).</span>;
                      if (diff > 0) return <span className="text-amber-700">⚠️ Short by £{diff.toLocaleString("en-GB")}. Your sources must equal the balance.</span>;
                      return <span className="text-amber-700">⚠️ Over by £{Math.abs(diff).toLocaleString("en-GB")}. Your sources must equal the balance.</span>;
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="pt-2 flex justify-end">
              <button type="button" onClick={handleNext} className="rounded bg-black text-white px-5 py-2 text-sm font-medium hover:opacity-90 transition">
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
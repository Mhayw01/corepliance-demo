type Props = {
  balanceRequired: number;
  fundingTotal: number;
};
export default function SummaryBar({ balanceRequired, fundingTotal }: Props) {
  const diff = balanceRequired - fundingTotal;
  const status =
    diff === 0
      ? "Matched"
      : diff > 0
      ? `Short by £${diff.toLocaleString("en-GB")}`
      : `Over by £${Math.abs(diff).toLocaleString("en-GB")}`;
  const color = diff === 0 ? "text-green-700" : "text-amber-700";

  return (
    <section className="rounded-xl border bg-white p-4 flex items-center justify-between">
      <div className="text-sm">
        <div>
          Balance required:{" "}
          <span className="font-medium">£{(balanceRequired || 0).toLocaleString("en-GB")}</span>
        </div>
        <div>
          Funding total:{" "}
          <span className="font-medium">£{(fundingTotal || 0).toLocaleString("en-GB")}</span>
        </div>
      </div>
      <div className={`text-sm font-medium ${color}`}>{status}</div>
    </section>
  );
}

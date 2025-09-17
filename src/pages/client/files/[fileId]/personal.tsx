import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import prisma from "@/lib/prisma";

type FileView = {
  id: string;
  firm?: { name: string };
  clientDisplayName: string;
  clientDetails: any | null;
};

type Props = {
  file: FileView | null;
};

export default function PersonalDetailsPage({ file }: Props) {
  const router = useRouter();
  if (!file) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-red-600">File not found.</p>
        <Link href="/client" className="text-blue-600 underline mt-2 inline-block">← Back to Client landing</Link>
      </main>
    );
  }

  const fileId = file!.id;

  const [firstName, setFirstName] = useState<string>(file.clientDetails?.firstName ?? "");
  const [middleNames, setMiddleNames] = useState<string>(file.clientDetails?.middleNames ?? "");
  const [lastName, setLastName] = useState<string>(file.clientDetails?.lastName ?? "");
  const [dob, setDob] = useState<string>(file.clientDetails?.dob ?? "");
  const [address, setAddress] = useState<string>(file.clientDetails?.address ?? "");
  const [addressQuery, setAddressQuery] = useState<string>(file.clientDetails?.address ?? "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [employer, setEmployer] = useState<string>(file.clientDetails?.employer ?? "");
  const [occupation, setOccupation] = useState<string>(file.clientDetails?.occupation ?? "");
  const [salary, setSalary] = useState<string>(file.clientDetails?.salary ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleAddressChange(val: string) {
    setAddressQuery(val);
    setAddress(val); // keep address state in sync with the visible query
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const details = {
        firstName,
        middleNames,
        lastName,
        dob,
        address,
        employer,
        occupation,
        salary
      };
      const res = await fetch("/api/client/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, details })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to save details.");
        return;
      }
      setSuccess("Saved!");
      setTimeout(() => router.push(`/client/files/${fileId}`), 400);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Personal Details — {file.firm?.name ?? "Firm"}</h1>
          <p className="text-sm text-gray-600 mt-1">{file.clientDisplayName}</p>
        </div>
        <Link href={`/client/files/${fileId}`} className="text-sm text-blue-600 underline">← Back to dashboard</Link>
      </header>

      <section className="rounded-xl border bg-white p-5 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First name</label>
              <input value={firstName} onChange={(e)=>setFirstName(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Middle name/s</label>
              <input value={middleNames} onChange={(e)=>setMiddleNames(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Surname</label>
              <input value={lastName} onChange={(e)=>setLastName(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <input type="date" value={dob} onChange={(e)=>setDob(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">Postcode (recommended)</label>
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
                    onClick={() => { setAddressQuery(s); setAddress(s); setSuggestions([]); }}
                    className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-gray-500">Tip: start with your postcode for the best results. Then choose your full address from the list.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Current Employer</label>
              <input value={employer} onChange={(e)=>setEmployer(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Occupation</label>
              <input value={occupation} onChange={(e)=>setOccupation(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Salary</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2 pl-7"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-black text-white px-5 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {submitting ? "Saving…" : "SUBMIT"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const fileId = ctx.params?.fileId as string | undefined;
  if (!fileId) return { props: { file: null } };
  try {
    const f = await prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        clientDisplayName: true,
        clientDetails: true,
        firm: { select: { name: true } },
      },
    });
    if (!f) return { props: { file: null } };
    return { props: { file: f } };
  } catch (e) {
    console.error("SSR personal load error:", e);
    return { props: { file: null } };
  }
};

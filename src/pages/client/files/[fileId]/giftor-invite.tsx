import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import prisma from "@/lib/prisma";

type Props = {
  file: {
    id: string;
    firm?: { name: string };
  } | null;
};

export default function GiftorInvitePage({ file }: Props) {
  const router = useRouter();
  if (!file) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-red-600">File not found.</p>
        <Link href="/client" className="text-blue-600 underline mt-2 inline-block">← Back to Client landing</Link>
      </main>
    );
  }
  const fileId = file.id;

  // Form state
  const [firstName, setFirstName] = useState("");
  const [middleNames, setMiddleNames] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddressChange(val: string) {
    setAddressQuery(val);
    const q = val.trim();
    if (q.length < 3) { setSuggestions([]); return; }
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

  const emailsMatch = email.trim() !== "" && email.trim() === emailConfirm.trim();
  const canSend = !!firstName && !!lastName && !!dob && !!address && !!email && emailsMatch && !!phone && !sending;

  async function handleSendInvite() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/client/giftor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          giftor: {
            firstName, middleNames, lastName, dob, address, email, phone,
            status: "INVITED",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to send invite.");
        return;
      }
      setSent(true);
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function goNext() {
    router.push(`/client/files/${fileId}/uploads`);
  }

  return (
    <main className="min-h-screen p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Source of Funds — Gifted Deposit</h1>
          <p className="text-sm text-gray-600 mt-1">{file.firm?.name ?? "Firm"}</p>
        </div>
        <Link href={`/client/files/${fileId}`} className="text-sm text-blue-600 underline">← Back to dashboard</Link>
      </header>

      <section className="rounded-xl border bg-white p-6 space-y-6 max-w-2xl">
        <div>
          <div className="inline-block rounded-full border px-4 py-1 text-sm font-medium">Gifted Deposit</div>
          <p className="text-sm text-gray-600 mt-2">
            If you are receiving part or all of your funds as a gift from someone else, the giftor must complete ID checks and provide a confirmation letter.
          </p>
          <p className="text-sm text-teal-700 mt-2">
            Complete Giftor details and send invite for them to log in and upload required evidence.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {sent && <p className="text-sm text-green-700">Invite sent ✓</p>}

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
          <label className="block text-sm font-medium text-gray-700">Address</label>
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
                    setAddress(s);
                    setSuggestions([]);
                  }}
                  className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-gray-500">Tip: start with your postcode for the best results. Then choose the full address from the list.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email address</label>
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm email address</label>
            <input type="email" value={emailConfirm} onChange={(e)=>setEmailConfirm(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            {!emailsMatch && (emailConfirm.length > 0) && (
              <p className="mt-1 text-xs text-red-600">Emails do not match.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSendInvite}
            disabled={!canSend}
            className="rounded bg-black text-white px-5 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send invite"}
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded bg-black text-white px-5 py-2 text-sm font-medium hover:opacity-90 transition"
          >
            Next
          </button>
        </div>
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
        firm: { select: { name: true } },
      },
    });
    if (!f) return { props: { file: null } };
    return { props: { file: f } };
  } catch (e) {
    console.error("SSR giftor load error:", e);
    return { props: { file: null } };
  }
};

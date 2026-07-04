import Link from "next/link";
import type { RoundRef } from "@/lib/rounds";

/**
 * Horizontal tabs to switch between the rounds of a group. In player view the
 * tabs link to each round's page; in admin view they carry the shared token.
 */
export default function RoundTabs({
  rounds,
  currentCode,
  adminToken,
}: {
  rounds: RoundRef[];
  currentCode: string;
  adminToken?: string;
}) {
  if (rounds.length < 2) return null;

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      {rounds.map((r) => {
        const href = adminToken
          ? `/c/${r.joinCode}/admin?token=${adminToken}`
          : `/c/${r.joinCode}`;
        const active = r.joinCode === currentCode;
        return (
          <Link
            key={r.joinCode}
            href={href}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-pitch text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {r.round}
          </Link>
        );
      })}
    </nav>
  );
}

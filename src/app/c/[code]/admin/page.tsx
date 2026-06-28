import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeJoinCode } from "@/lib/codes";
import {
  ROUND_OPTIONS,
  isFootballDataConfigured,
} from "@/lib/footballData";
import {
  addMatch,
  deleteMatch,
  setResult,
  setRound,
  syncFromApi,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { token?: string; msg?: string; error?: string };
}) {
  const code = normalizeJoinCode(params.code);
  const token = searchParams.token ?? "";
  const competition = await prisma.competition.findUnique({
    where: { joinCode: code },
    include: { matches: { orderBy: { kickoff: "asc" } } },
  });
  if (!competition) notFound();
  if (competition.adminToken !== token) {
    return (
      <div className="card p-6">
        <h1 className="text-lg font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-slate-500">
          This page needs the secret organiser link that was shown when the
          competition was created. Check the URL includes the right{" "}
          <code>token</code>.
        </p>
        <Link href={`/c/${code}`} className="btn-secondary mt-4">
          Go to competition
        </Link>
      </div>
    );
  }

  const apiConfigured = isFootballDataConfigured();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Manage · {competition.name}</h1>
        <Link href={`/c/${code}`} className="text-sm text-pitch underline">
          View as player →
        </Link>
      </div>

      {searchParams.msg && (
        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {searchParams.msg}
        </p>
      )}
      {searchParams.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {searchParams.error}
        </p>
      )}

      {/* Share */}
      <section className="card p-5">
        <h2 className="font-bold">Invite friends</h2>
        <p className="mt-1 text-sm text-slate-500">
          Share this join code so friends can pick a name and predict:
        </p>
        <p className="mt-2 font-mono text-2xl font-bold tracking-widest">
          {competition.joinCode}
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Bookmark this admin page — it’s the only way back in to manage the
          competition.
        </p>
      </section>

      {/* Round + sync */}
      <section className="card space-y-4 p-5">
        <h2 className="font-bold">Round &amp; fixtures</h2>
        <form action={setRound} className="flex items-end gap-3">
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="token" value={token} />
          <div className="flex-1">
            <label className="label" htmlFor="round">
              Round being predicted
            </label>
            <select
              id="round"
              name="round"
              defaultValue={competition.round}
              className="input"
            >
              {ROUND_OPTIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <button className="btn-secondary">Save</button>
        </form>

        <form action={syncFromApi} className="border-t border-slate-100 pt-4">
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="token" value={token} />
          <button className="btn-primary w-full" disabled={!apiConfigured}>
            Sync “{competition.round}” from football-data.org
          </button>
          <p className="mt-2 text-xs text-slate-400">
            {apiConfigured
              ? "Pulls fixtures, kickoff times and final scores. Re-run any time to refresh results."
              : "Set FOOTBALL_DATA_TOKEN in your environment to enable automatic syncing. Until then, add matches and results by hand below."}
          </p>
        </form>
      </section>

      {/* Add match manually */}
      <section className="card space-y-3 p-5">
        <h2 className="font-bold">Add a match manually</h2>
        <form action={addMatch} className="space-y-3">
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="token" value={token} />
          <div className="grid grid-cols-2 gap-3">
            <input name="homeTeam" className="input" placeholder="Home team" required />
            <input name="awayTeam" className="input" placeholder="Away team" required />
          </div>
          <div className="flex items-center gap-4">
            <input
              name="kickoff"
              type="datetime-local"
              className="input flex-1"
              required
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="isKnockout" defaultChecked /> Knockout
            </label>
          </div>
          <button className="btn-secondary w-full">Add match</button>
        </form>
      </section>

      {/* Results */}
      <section className="space-y-3">
        <h2 className="font-bold">Matches &amp; results ({competition.matches.length})</h2>
        {competition.matches.length === 0 && (
          <p className="card p-5 text-sm text-slate-400">
            No matches yet. Sync from the API or add one above.
          </p>
        )}
        {competition.matches.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">
                {m.homeTeam} <span className="text-slate-400">v</span> {m.awayTeam}
              </span>
              <span className="text-xs text-slate-400">
                {m.kickoff.toLocaleString(undefined, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <form
              action={setResult}
              className="flex flex-wrap items-end gap-2 text-sm"
            >
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="matchId" value={m.id} />
              <div>
                <label className="label text-xs">Status</label>
                <select name="status" defaultValue={m.status} className="input py-1.5">
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PLAY">In play</option>
                  <option value="FINISHED">Finished</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">90&apos; score</label>
                <div className="flex items-center gap-1">
                  <input
                    name="homeScore"
                    type="number"
                    min={0}
                    defaultValue={m.homeScore ?? ""}
                    className="input w-14 py-1.5 text-center"
                  />
                  <span>:</span>
                  <input
                    name="awayScore"
                    type="number"
                    min={0}
                    defaultValue={m.awayScore ?? ""}
                    className="input w-14 py-1.5 text-center"
                  />
                </div>
              </div>
              {m.isKnockout && (
                <div>
                  <label className="label text-xs">Advances</label>
                  <select
                    name="qualifier"
                    defaultValue={m.qualifier ?? ""}
                    className="input py-1.5"
                  >
                    <option value="">—</option>
                    <option value="HOME">{m.homeTeam}</option>
                    <option value="AWAY">{m.awayTeam}</option>
                  </select>
                </div>
              )}
              <button className="btn-primary py-1.5">Save</button>
            </form>
            <form action={deleteMatch} className="mt-2">
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="matchId" value={m.id} />
              <button className="text-xs text-red-500 hover:underline">
                Remove match
              </button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}

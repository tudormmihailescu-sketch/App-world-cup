import { createCompetition, joinByCode } from "./actions";
import { ROUND_OPTIONS } from "@/lib/footballData";

export const dynamic = "force-dynamic";

export default function HomePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="space-y-6">
      {searchParams.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {searchParams.error}
        </p>
      )}

      <section className="card p-6">
        <h1 className="text-xl font-bold">Start a competition</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a private group, then share the join code with your friends.
        </p>
        <form action={createCompetition} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Competition name
            </label>
            <input
              id="name"
              name="name"
              className="input"
              placeholder="The Office Sweepstake"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="round">
              Round to predict
            </label>
            <select id="round" name="round" className="input" defaultValue="Round of 32">
              {ROUND_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full">
            Create competition
          </button>
        </form>
      </section>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <section className="card p-6">
        <h2 className="text-xl font-bold">Join with a code</h2>
        <p className="mt-1 text-sm text-slate-500">
          Got a code from a friend? Enter it to jump in.
        </p>
        <form action={joinByCode} className="mt-4 flex gap-3">
          <input
            name="code"
            className="input font-mono uppercase tracking-widest"
            placeholder="ABC123"
            maxLength={8}
            required
          />
          <button type="submit" className="btn-secondary shrink-0">
            Join
          </button>
        </form>
      </section>
    </div>
  );
}

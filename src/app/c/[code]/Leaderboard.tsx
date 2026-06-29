export interface StandingRow {
  playerId: string;
  name: string;
  points: number;
  exact: number; // exact 90' scores
  goalDiffs: number; // correct goal differences
  qualifiers: number; // correct qualifying teams
  isCurrent: boolean;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({
  rows,
  scoredMatches,
}: {
  rows: StandingRow[];
  scoredMatches: number;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-bold">
          Leaderboard{" "}
          <span className="text-sm font-normal text-slate-400">
            {scoredMatches === 0
              ? "(no results yet)"
              : `(after ${scoredMatches} ${scoredMatches === 1 ? "game" : "games"})`}
          </span>
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Breakdown: exact scores · goal differences · correct teams
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-400">No players yet.</p>
      ) : (
        <ol>
          {rows.map((row, i) => (
            <li
              key={row.playerId}
              className={`flex items-center gap-3 border-b border-slate-50 px-5 py-3 last:border-0 ${
                row.isCurrent ? "bg-pitch/5" : ""
              }`}
            >
              <span className="w-6 text-center text-sm font-semibold text-slate-400">
                {MEDALS[i] ?? i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {row.name}
                  {row.isCurrent && (
                    <span className="ml-1 text-xs text-pitch">(you)</span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {row.exact} exact · {row.goalDiffs} goal-diff ·{" "}
                  {row.qualifiers} {row.qualifiers === 1 ? "team" : "teams"}
                </p>
              </div>
              <span className="w-12 text-right text-lg font-bold tabular-nums">
                {row.points}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

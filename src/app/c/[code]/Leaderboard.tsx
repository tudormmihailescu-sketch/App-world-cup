export interface StandingRow {
  playerId: string;
  name: string;
  points: number;
  exact: number;
  scored: number; // matches with a result the player predicted
  isCurrent: boolean;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ rows }: { rows: StandingRow[] }) {
  return (
    <section className="card overflow-hidden">
      <h2 className="border-b border-slate-100 px-5 py-4 text-lg font-bold">
        Leaderboard
      </h2>
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
              <span className="flex-1 truncate font-medium">
                {row.name}
                {row.isCurrent && (
                  <span className="ml-1 text-xs text-pitch">(you)</span>
                )}
              </span>
              <span className="text-xs text-slate-400">
                {row.exact} exact · {row.scored} played
              </span>
              <span className="w-14 text-right text-lg font-bold tabular-nums">
                {row.points}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

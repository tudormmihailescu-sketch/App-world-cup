import { impliedQualifier } from "@/lib/scoring";

export interface StandingRow {
  playerId: string;
  name: string;
  points: number;
  exact: number; // exact 90' scores
  goalDiffs: number; // correct goal differences
  qualifiers: number; // correct qualifying teams
  isCurrent: boolean;
  // The player's (now-locked) prediction for the live game, when one is on.
  livePrediction: {
    homeScore: number;
    awayScore: number;
    qualifier: "HOME" | "AWAY" | null;
  } | null;
}

interface LiveMatch {
  homeTeam: string;
  awayTeam: string;
  isKnockout: boolean;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function formatPick(row: StandingRow, live: LiveMatch): string {
  if (!row.livePrediction) return "No prediction";
  const { homeScore, awayScore, qualifier } = row.livePrediction;
  const score = `${homeScore}–${awayScore}`;
  if (live.isKnockout) {
    // Show the chosen team, or the one implied by a non-draw score.
    const side = qualifier ?? impliedQualifier(homeScore, awayScore);
    if (side) {
      const team = side === "HOME" ? live.homeTeam : live.awayTeam;
      return `${score} · ${team}`;
    }
  }
  return score;
}

export default function Leaderboard({
  rows,
  scoredMatches,
  liveMatch,
}: {
  rows: StandingRow[];
  scoredMatches: number;
  liveMatch: LiveMatch | null;
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
        {liveMatch && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            🔴 Live: {liveMatch.homeTeam} v {liveMatch.awayTeam} — everyone’s
            picks below
          </p>
        )}
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
                {liveMatch && (
                  <p className="text-xs font-medium text-red-600">
                    🔴 Pick: {formatPick(row, liveMatch)}
                  </p>
                )}
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

"use client";

import { submitPrediction } from "./actions";
import { impliedQualifier, type ScoreBreakdown } from "@/lib/scoring";

export interface MatchView {
  id: string;
  stage: string;
  isKnockout: boolean;
  homeTeam: string;
  awayTeam: string;
  homeCrest: string | null;
  awayCrest: string | null;
  kickoffISO: string;
  status: "SCHEDULED" | "IN_PLAY" | "FINISHED";
  homeScore: number | null;
  awayScore: number | null;
  finalHomeScore: number | null;
  finalAwayScore: number | null;
  decidedBy: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
  qualifier: "HOME" | "AWAY" | null;
}

export interface PredictionView {
  homeScore: number;
  awayScore: number;
  qualifier: "HOME" | "AWAY" | null;
}

function TeamBadge({ name, crest }: { name: string; crest: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crest} alt="" className="h-6 w-6 object-contain" />
      ) : (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-xs">
          ⚽
        </span>
      )}
      <span className="truncate font-medium">{name}</span>
    </div>
  );
}

export default function PredictionForm({
  code,
  match,
  prediction,
  locked,
  points,
}: {
  code: string;
  match: MatchView;
  prediction: PredictionView | null;
  locked: boolean;
  points: ScoreBreakdown | null;
}) {
  const kickoff = new Date(match.kickoffISO);
  const hasResult = match.homeScore !== null && match.awayScore !== null;
  const wentBeyond90 =
    (match.decidedBy === "EXTRA_TIME" || match.decidedBy === "PENALTIES") &&
    match.finalHomeScore !== null &&
    match.finalAwayScore !== null;
  // The advancing team: the one recorded, or — for a decisive 90' result — the
  // one implied by the score.
  const winnerSide =
    hasResult && match.isKnockout
      ? (match.qualifier ??
        impliedQualifier(match.homeScore!, match.awayScore!))
      : null;
  const qualifierWinnerName =
    winnerSide === "HOME"
      ? match.homeTeam
      : winnerSide === "AWAY"
        ? match.awayTeam
        : null;

  return (
    <div id={`match-${match.id}`} className="card p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">
          {match.stage.replaceAll("_", " ")}
        </span>
        <span>
          {kickoff.toLocaleString(undefined, {
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      <form action={submitPrediction}>
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="matchId" value={match.id} />

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <TeamBadge name={match.homeTeam} crest={match.homeCrest} />
          <div className="flex items-center gap-1.5">
            <input
              name="homeScore"
              type="number"
              min={0}
              max={30}
              defaultValue={prediction?.homeScore ?? ""}
              disabled={locked}
              required
              className="input w-14 text-center text-lg font-bold"
              aria-label={`${match.homeTeam} goals`}
            />
            <span className="text-slate-400">:</span>
            <input
              name="awayScore"
              type="number"
              min={0}
              max={30}
              defaultValue={prediction?.awayScore ?? ""}
              disabled={locked}
              required
              className="input w-14 text-center text-lg font-bold"
              aria-label={`${match.awayTeam} goals`}
            />
          </div>
          <div className="flex justify-end">
            <TeamBadge name={match.awayTeam} crest={match.awayCrest} />
          </div>
        </div>

        {match.isKnockout && (
          <fieldset className="mt-3" disabled={locked}>
            <legend className="mb-1 text-xs font-medium text-slate-500">
              Who advances? <span className="text-slate-400">(+2)</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(["HOME", "AWAY"] as const).map((side) => (
                <label
                  key={side}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm has-[:checked]:border-pitch has-[:checked]:bg-pitch/5 has-[:checked]:font-semibold has-[:checked]:text-pitch"
                >
                  <input
                    type="radio"
                    name="qualifier"
                    value={side}
                    defaultChecked={prediction?.qualifier === side}
                    className="sr-only"
                  />
                  {side === "HOME" ? match.homeTeam : match.awayTeam}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              A clear winning score already counts as picking that team — only
              choose here if you’re predicting a draw.
            </p>
          </fieldset>
        )}

        {!locked && (
          <button type="submit" className="btn-primary mt-3 w-full">
            {prediction ? "Update prediction" : "Save prediction"}
          </button>
        )}
      </form>

      {locked && (
        <div className="mt-3 border-t border-slate-100 pt-3 text-sm">
          {hasResult ? (
            <div className="flex items-center justify-between">
              <span className="text-slate-600">
                Result <strong>{match.homeScore}</strong>–
                <strong>{match.awayScore}</strong>
                {wentBeyond90 && (
                  <span className="text-slate-400">
                    {" "}
                    · {match.decidedBy === "PENALTIES" ? "pens" : "AET"}{" "}
                    {match.finalHomeScore}–{match.finalAwayScore}
                  </span>
                )}
                {qualifierWinnerName && (
                  <span className="text-slate-400">
                    {" "}
                    · {qualifierWinnerName} advance
                  </span>
                )}
              </span>
              {points && (
                <span
                  className="rounded-full bg-pitch/10 px-2.5 py-1 text-xs font-bold text-pitch"
                  title={`Exact ${points.exactScore} · GD ${points.goalDifference} · Qualifier ${points.qualifier}`}
                >
                  +{points.total} pts
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">
              Locked — awaiting result
              {prediction &&
                ` · you predicted ${prediction.homeScore}–${prediction.awayScore}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

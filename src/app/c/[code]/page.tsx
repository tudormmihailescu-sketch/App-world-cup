import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";
import { normalizeJoinCode } from "@/lib/codes";
import { hasResult, scorePrediction, type Side } from "@/lib/scoring";
import { isFootballDataConfigured } from "@/lib/footballData";
import { isSyncStale, syncCompetition } from "@/lib/sync";
import JoinForm from "./JoinForm";
import PredictionForm, { type MatchView } from "./PredictionForm";
import Leaderboard, { type StandingRow } from "./Leaderboard";
import ShareCode from "./ShareCode";

export const dynamic = "force-dynamic";

export default async function CompetitionPage({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { error?: string };
}) {
  const code = normalizeJoinCode(params.code);

  // Opportunistic live refresh: if this competition's data is stale and a data
  // source is configured, pull the latest scores before rendering. Bounded by a
  // short timeout (and swallowed on error) so a slow API never blocks the page.
  if (isFootballDataConfigured()) {
    const lite = await prisma.competition.findUnique({
      where: { joinCode: code },
      select: { id: true, round: true, lastSyncedAt: true },
    });
    if (lite && isSyncStale(lite.lastSyncedAt)) {
      await Promise.race([
        syncCompetition(lite).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    }
  }

  const competition = await prisma.competition.findUnique({
    where: { joinCode: code },
    include: {
      matches: { orderBy: { kickoff: "asc" } },
      players: { include: { predictions: true } },
    },
  });
  if (!competition) notFound();

  const currentPlayer = await getCurrentPlayer(competition.id);

  // --- Standings ---------------------------------------------------------
  const matchById = new Map(competition.matches.map((m) => [m.id, m]));
  const standings: StandingRow[] = competition.players
    .map((player) => {
      let points = 0;
      let exact = 0;
      let scored = 0;
      for (const pred of player.predictions) {
        const match = matchById.get(pred.matchId);
        if (!match || !hasResult(match)) continue;
        scored++;
        const breakdown = scorePrediction(
          {
            homeScore: pred.homeScore,
            awayScore: pred.awayScore,
            qualifier: pred.qualifier as Side | null,
          },
          {
            homeScore: match.homeScore!,
            awayScore: match.awayScore!,
            qualifier: match.qualifier as Side | null,
          },
          match.isKnockout,
        );
        points += breakdown.total;
        if (breakdown.exactScore) exact++;
      }
      return {
        playerId: player.id,
        name: player.name,
        points,
        exact,
        scored,
        isCurrent: currentPlayer?.id === player.id,
      };
    })
    .sort((a, b) => b.points - a.points || b.exact - a.exact || a.name.localeCompare(b.name));

  // --- Header ------------------------------------------------------------
  const header = (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{competition.name}</h1>
          <p className="text-sm text-slate-500">
            {competition.round} · {competition.players.length}{" "}
            {competition.players.length === 1 ? "player" : "players"}
          </p>
        </div>
        <ShareCode code={competition.joinCode} />
      </div>
    </section>
  );

  if (!currentPlayer) {
    return (
      <div className="space-y-6">
        {searchParams.error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {searchParams.error}
          </p>
        )}
        {header}
        <JoinForm code={competition.joinCode} competitionName={competition.name} />
        <Leaderboard rows={standings} />
      </div>
    );
  }

  // --- Predictions for the signed-in player ------------------------------
  const myPredictions = new Map(
    competition.players
      .find((p) => p.id === currentPlayer.id)!
      .predictions.map((p) => [p.matchId, p]),
  );
  const now = Date.now();

  return (
    <div className="space-y-6">
      {searchParams.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {searchParams.error}
        </p>
      )}
      {header}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Your predictions</h2>
          <span className="text-xs text-slate-400">
            Playing as {currentPlayer.name}
          </span>
        </div>

        {competition.matches.length === 0 ? (
          <p className="card p-6 text-sm text-slate-400">
            No matches yet — the organiser still needs to add this round’s
            fixtures.
          </p>
        ) : (
          competition.matches.map((m) => {
            const pred = myPredictions.get(m.id);
            const locked = m.status !== "SCHEDULED" || now >= m.kickoff.getTime();
            const matchView: MatchView = {
              id: m.id,
              stage: m.stage,
              isKnockout: m.isKnockout,
              homeTeam: m.homeTeam,
              awayTeam: m.awayTeam,
              homeCrest: m.homeCrest,
              awayCrest: m.awayCrest,
              kickoffISO: m.kickoff.toISOString(),
              status: m.status,
              homeScore: m.homeScore,
              awayScore: m.awayScore,
              finalHomeScore: m.finalHomeScore,
              finalAwayScore: m.finalAwayScore,
              decidedBy: m.decidedBy as MatchView["decidedBy"],
              qualifier: m.qualifier as "HOME" | "AWAY" | null,
            };
            const points =
              pred && hasResult(m)
                ? scorePrediction(
                    {
                      homeScore: pred.homeScore,
                      awayScore: pred.awayScore,
                      qualifier: pred.qualifier as Side | null,
                    },
                    {
                      homeScore: m.homeScore!,
                      awayScore: m.awayScore!,
                      qualifier: m.qualifier as Side | null,
                    },
                    m.isKnockout,
                  )
                : null;
            return (
              <PredictionForm
                key={m.id}
                code={competition.joinCode}
                match={matchView}
                prediction={
                  pred
                    ? {
                        homeScore: pred.homeScore,
                        awayScore: pred.awayScore,
                        qualifier: pred.qualifier as "HOME" | "AWAY" | null,
                      }
                    : null
                }
                locked={locked}
                points={points}
              />
            );
          })
        )}
      </section>

      <Leaderboard rows={standings} />
    </div>
  );
}

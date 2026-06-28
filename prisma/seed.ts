import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// A tiny demo competition so you can click around without a live data source.
async function main() {
  const joinCode = "DEMO24";
  await prisma.competition.deleteMany({ where: { joinCode } });

  const competition = await prisma.competition.create({
    data: {
      name: "Demo Sweepstake",
      round: "Round of 16",
      joinCode,
      adminToken: "demo-admin-token",
    },
  });

  const now = Date.now();
  const hours = (h: number) => new Date(now + h * 3600_000);

  await prisma.match.createMany({
    data: [
      {
        competitionId: competition.id,
        stage: "LAST_16",
        isKnockout: true,
        homeTeam: "Brazil",
        awayTeam: "Croatia",
        kickoff: hours(24),
        status: "SCHEDULED",
      },
      {
        competitionId: competition.id,
        stage: "LAST_16",
        isKnockout: true,
        homeTeam: "Argentina",
        awayTeam: "Netherlands",
        kickoff: hours(28),
        status: "SCHEDULED",
      },
      {
        // A finished match, to show scoring on the leaderboard.
        competitionId: competition.id,
        stage: "LAST_16",
        isKnockout: true,
        homeTeam: "France",
        awayTeam: "Poland",
        kickoff: hours(-2),
        status: "FINISHED",
        homeScore: 3,
        awayScore: 1,
        qualifier: "HOME",
      },
    ],
  });

  console.log(
    `Seeded competition "${competition.name}" — join code ${joinCode}\n` +
      `Admin: /c/${joinCode}/admin?token=${competition.adminToken}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

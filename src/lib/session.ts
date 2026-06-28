import { cookies } from "next/headers";
import { prisma } from "./prisma";

// One cookie per competition holds that player's session token. This lets a
// browser be a different player in different competitions.
const cookieName = (competitionId: string) => `wc_player_${competitionId}`;

const ONE_YEAR = 60 * 60 * 24 * 365;

export function setPlayerCookie(competitionId: string, sessionToken: string) {
  cookies().set(cookieName(competitionId), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

/** Resolve the current player for a competition from the request cookie. */
export async function getCurrentPlayer(competitionId: string) {
  const token = cookies().get(cookieName(competitionId))?.value;
  if (!token) return null;
  return prisma.player.findFirst({
    where: { sessionToken: token, competitionId },
  });
}

import { prisma } from "./prisma";

export interface RoundRef {
  id: string;
  joinCode: string;
  round: string;
  parentId: string | null;
}

/** The id of the group's root round (itself if it is the root). */
export function rootIdOf(c: { id: string; parentId: string | null }): string {
  return c.parentId ?? c.id;
}

/** All rounds in the same group as `c`, oldest first. */
export async function getGroupRounds(c: {
  id: string;
  parentId: string | null;
}): Promise<RoundRef[]> {
  const rootId = rootIdOf(c);
  return prisma.competition.findMany({
    where: { OR: [{ id: rootId }, { parentId: rootId }] },
    orderBy: { createdAt: "asc" },
    select: { id: true, joinCode: true, round: true, parentId: true },
  });
}

/** The group's shared admin token (the root round's token). */
export async function getGroupAdminToken(c: {
  id: string;
  parentId: string | null;
}): Promise<string | null> {
  const rootId = rootIdOf(c);
  const root = await prisma.competition.findUnique({
    where: { id: rootId },
    select: { adminToken: true },
  });
  return root?.adminToken ?? null;
}

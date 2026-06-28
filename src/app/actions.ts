"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateJoinCode, normalizeJoinCode } from "@/lib/codes";

/** Create a new competition and send the creator to its admin page. */
export async function createCompetition(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const round = String(formData.get("round") ?? "Round of 32").trim();
  if (!name) {
    redirect("/?error=" + encodeURIComponent("Please name your competition."));
  }

  // Generate a join code, retrying on the (rare) chance of a collision.
  let joinCode = generateJoinCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.competition.findUnique({ where: { joinCode } });
    if (!existing) break;
    joinCode = generateJoinCode();
  }

  const competition = await prisma.competition.create({
    data: { name, round, joinCode },
  });

  redirect(`/c/${competition.joinCode}/admin?token=${competition.adminToken}`);
}

/** Look up a competition by code and send the visitor to it. */
export async function joinByCode(formData: FormData) {
  const code = normalizeJoinCode(String(formData.get("code") ?? ""));
  if (!code) {
    redirect("/?error=" + encodeURIComponent("Enter a join code."));
  }
  const competition = await prisma.competition.findUnique({
    where: { joinCode: code },
  });
  if (!competition) {
    redirect("/?error=" + encodeURIComponent(`No competition with code ${code}.`));
  }
  redirect(`/c/${competition.joinCode}`);
}

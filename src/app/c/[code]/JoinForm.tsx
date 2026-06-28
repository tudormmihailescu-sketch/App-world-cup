"use client";

import { joinAsPlayer } from "./actions";

export default function JoinForm({
  code,
  competitionName,
}: {
  code: string;
  competitionName: string;
}) {
  return (
    <section className="card p-6">
      <h1 className="text-xl font-bold">Join “{competitionName}”</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pick a display name to start predicting. We’ll remember you on this
        device.
      </p>
      <form action={joinAsPlayer} className="mt-4 flex gap-3">
        <input type="hidden" name="code" value={code} />
        <input
          name="name"
          className="input"
          placeholder="Your name"
          maxLength={30}
          required
          autoFocus
        />
        <button type="submit" className="btn-primary shrink-0">
          Join
        </button>
      </form>
    </section>
  );
}

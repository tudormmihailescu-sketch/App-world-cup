"use client";

import { useState } from "react";

export default function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/c/${code}`
        : code;
    try {
      if (navigator.share) {
        await navigator.share({ title: "World Cup Predictions", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* user dismissed the share sheet — ignore */
    }
  }

  return (
    <button
      onClick={copy}
      className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-right transition hover:bg-slate-50"
      title="Share invite link"
    >
      <span className="block text-[10px] uppercase tracking-wide text-slate-400">
        {copied ? "Copied!" : "Join code"}
      </span>
      <span className="font-mono text-lg font-bold tracking-widest">{code}</span>
    </button>
  );
}

import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Cup Predictions",
  description:
    "Predict World Cup knockout results with your friends and climb the leaderboard.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b6b3a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4">
          <header className="flex items-center justify-between py-5">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span className="text-2xl">🏆</span>
              <span>World Cup Predictions</span>
            </Link>
          </header>
          <main className="flex-1 pb-16">{children}</main>
          <footer className="py-6 text-center text-xs text-slate-400">
            Predict · Compete · Brag
          </footer>
        </div>
      </body>
    </html>
  );
}

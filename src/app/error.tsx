"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 text-white px-4">
      <div className="glass-panel max-w-md rounded-3xl p-8 text-center border border-white/10 bg-white/5 backdrop-blur-lg">
        <div className="mb-6 flex justify-center items-center gap-3">
          <img src="/logo.svg" alt="FormForge Logo" className="h-12 w-12 rounded-xl" />
          <span className="text-2xl font-bold">FormForge</span>
        </div>
        <h1 className="text-3xl font-black text-rose-400 mb-2">Something went wrong!</h1>
        <p className="text-slate-400 text-sm mb-8">
          An unexpected application error has occurred. Our engineers have been notified.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition text-center"
          >
            Go Home
          </Link>
          <button
            onClick={() => reset()}
            className="rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

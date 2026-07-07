import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 text-white px-4">
      <div className="glass-panel max-w-md rounded-3xl p-8 text-center border border-white/10 bg-white/5 backdrop-blur-lg">
        <div className="mb-6 flex justify-center items-center gap-3">
          <img src="/logo.svg" alt="FormForge Logo" className="h-12 w-12 rounded-xl" />
          <span className="text-2xl font-bold">FormForge</span>
        </div>
        <h1 className="text-4xl font-black text-white mb-2">404</h1>
        <p className="text-xl font-bold text-cyan-300 mb-4">Page Not Found</p>
        <p className="text-slate-400 text-sm mb-8">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition text-center"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200 transition text-center"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

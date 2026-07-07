export default function DashboardLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
        <p className="text-sm font-semibold text-slate-400">Loading Dashboard...</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-[#070915] text-slate-100 font-sans p-6">
      <div className="max-w-xl w-full p-8 rounded-2xl bg-[#0b0f22] border border-indigo-500/20 shadow-2xl space-y-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          API Operational & Live
        </div>
        
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            SLASH<span className="text-purple-400">FORGE</span> API
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            CET Campus Issue & Infrastructure Management Services
          </p>
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-indigo-950 text-left font-mono text-xs text-slate-300 space-y-1.5">
          <p><span className="text-purple-400">GET</span> /api/v1/health — Service Healthcheck</p>
          <p><span className="text-purple-400">GET</span> /api/v1/issues — Campus Issues Feed</p>
          <p><span className="text-purple-400">GET</span> /api/v1/assets — Equipment Registry</p>
          <p><span className="text-purple-400">GET</span> /api/v1/auth/session — Active Session</p>
        </div>

        <p className="text-[11px] text-slate-500">
          Slashforge Backend v1.0 • College of Engineering Trivandrum
        </p>
      </div>
    </div>
  );
}

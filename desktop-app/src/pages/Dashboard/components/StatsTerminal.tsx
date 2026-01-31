/**
 * StatsTerminal - Terminal-style stats display
 * Extracted from Dashboard.tsx
 */
import React from 'react';

interface StatsTerminalProps {
    stats: string;
}

const StatsTerminal: React.FC<StatsTerminalProps> = ({ stats }) => {
    if (!stats) return null;

    return (
        <div className="rounded-lg bg-[#0d1117] border border-border-default/50 overflow-hidden font-mono text-xs shadow-xl ring-1 ring-white/5 group transition-all hover:ring-accent-primary/20">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    </div>
                    <span className="ml-2 text-[10px] text-text-muted font-sans uppercase tracking-wider font-semibold opacity-60">
                        session_stats.log
                    </span>
                </div>
                <div className="text-[10px] text-text-muted opacity-40">bash</div>
            </div>

            {/* Terminal Body */}
            <div className="p-4 text-emerald-400 whitespace-pre-wrap leading-relaxed overflow-x-auto custom-scrollbar bg-opacity-50">
                <span className="text-pink-500 mr-2">$</span>
                {stats}
                <span className="animate-pulse inline-block w-1.5 h-3 bg-emerald-500 ml-1 align-middle" />
            </div>
        </div>
    );
};

export default StatsTerminal;

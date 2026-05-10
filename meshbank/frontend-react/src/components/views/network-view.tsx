import React from 'react';
import { useAuth } from '@/lib/auth';
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet,
  Globe,
  Radio,
  Cpu,
  Network
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NetworkViewProps {
  onBack: () => void;
}

export const NetworkView: React.FC<NetworkViewProps> = ({ onBack }) => {
  const { user } = useAuth();

  const generateRandomNodes = () => {
    return Array.from({length: 8}).map((_, i) => (
      <div key={i} className="flex items-center justify-between p-2 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors rounded">
         <div className="flex items-center gap-3">
            <div className={`size-2 rounded-full ${i % 3 === 0 ? 'bg-green-500 animate-pulse' : 'bg-[#EADFD4]/30'}`} />
            <span className="font-mono text-xs text-white/70">NODE_{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
         </div>
         <span className="font-mono text-xs text-white/40">{Math.floor(Math.random() * 80 + 10)}ms</span>
      </div>
    ));
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-up">
      {/* Complex Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 relative">
        <div className="absolute -top-6 -left-6 w-12 h-12 border-t-2 border-l-2 border-white/20 opacity-50" />
        <div className="absolute -bottom-6 -right-6 w-12 h-12 border-b-2 border-r-2 border-white/20 opacity-50" />
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[9px] font-mono text-green-400 font-bold uppercase flex items-center gap-2">
               <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
               Live Telemetry
            </div>
            <span className="text-[10px] font-mono text-white/40">v1.2.4-stable-mesh</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight leading-none">Command Center</h1>
        </div>

        <div className="flex flex-row gap-4 w-full md:w-auto z-10">
           <Button onClick={onBack} variant="outline" className="h-14 border border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-2xl">
             Return to Dashboard
           </Button>
           <div className="hidden md:flex flex-col items-end gap-1 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
             <span className="font-mono text-[10px] text-white/40">SYSTEM LOAD</span>
             <div className="flex gap-1">
               {Array.from({length: 12}).map((_, i) => (
                 <div key={i} className={`w-1 h-3 rounded-full ${i < 8 ? 'bg-[#4A3A32]' : 'bg-white/10'}`} />
               ))}
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        
        {/* Network Health Module */}
        <div className="glass-card p-8 rounded-3xl flex-1 flex flex-col group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#4A3A32]/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-[#4A3A32]/20 transition-colors duration-700" />
          
          <div className="flex items-center justify-between mb-8 text-white/60 relative z-10">
             <div className="flex items-center gap-2">
                 <Activity size={20} className="text-white" />
                 <h3 className="text-lg font-semibold text-white">Mesh Network Topology</h3>
             </div>
             <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
              <Network className="size-3 text-white/60" />
              <span className="text-xs font-medium text-white/80">Sync OK</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-6 relative z-10">
             {/* Decorative Radar/Grid element */}
             <div className="h-48 w-full bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-grid-pattern opacity-30" />
                <div className="size-24 rounded-full border border-white/20 flex items-center justify-center">
                  <div className="size-12 rounded-full border border-white/40 flex items-center justify-center">
                     <div className="size-3 rounded-full bg-green-400 shadow-[0_0_15px_rgba(74,222,128,1)] animate-ping" />
                  </div>
                </div>
                {/* Faux nodes on radar */}
                <div className="absolute top-8 left-12 size-1.5 rounded-full bg-white/50" />
                <div className="absolute bottom-10 right-16 size-2 rounded-full bg-white/80" />
                <div className="absolute top-16 right-10 size-1.5 rounded-full bg-white/30" />
                <div className="absolute bottom-12 left-16 size-1 rounded-full bg-white/40" />
             </div>

             <div className="bg-black/20 p-4 rounded-2xl border border-white/5 h-64 overflow-y-auto custom-scrollbar">
                {generateRandomNodes()}
             </div>
          </div>
        </div>

        {/* System Metrics */}
        <div className="flex flex-col gap-6">
            <div className="glass-card p-8 rounded-3xl">
               <div className="flex items-center gap-2 mb-8 text-white/60">
                   <Cpu size={20} className="text-white" />
                   <h3 className="text-lg font-semibold text-white">Hardware Telemetry</h3>
               </div>
               
               <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                       <span className="font-mono text-xs text-white/40">CPU TEMP</span>
                       <p className="font-mono text-2xl text-white">42.4°C</p>
                       <div className="w-full bg-white/10 h-1 mt-2 rounded-full overflow-hidden">
                           <div className="w-1/3 bg-green-400 h-full" />
                       </div>
                   </div>
                   <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                       <span className="font-mono text-xs text-white/40">MEM USAGE</span>
                       <p className="font-mono text-2xl text-white">1.8<span className="text-sm text-white/40">/4.0 GB</span></p>
                       <div className="w-full bg-white/10 h-1 mt-2 rounded-full overflow-hidden">
                           <div className="w-1/2 bg-blue-400 h-full" />
                       </div>
                   </div>
                   <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                       <span className="font-mono text-xs text-white/40">LOCAL IO</span>
                       <p className="font-mono text-2xl text-white">14.2<span className="text-sm text-white/40">MB/s</span></p>
                       <div className="w-full bg-white/10 h-1 mt-2 rounded-full overflow-hidden">
                           <div className="w-1/4 bg-purple-400 h-full" />
                       </div>
                   </div>
                   <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                       <span className="font-mono text-xs text-white/40">UPTIME</span>
                       <p className="font-mono text-2xl text-green-400">99.99%</p>
                       <p className="font-mono text-xs text-white/40 mt-2">Sys OK</p>
                   </div>
               </div>
            </div>

            <div className="glass-card p-8 rounded-3xl flex-1">
               <div className="flex items-center gap-2 mb-6 text-white/60">
                   <Globe size={20} className="text-white" />
                   <h3 className="text-lg font-semibold text-white">Protocol Status</h3>
               </div>
               <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                     <span className="text-sm font-medium text-white/70">Blockchain Hash</span>
                     <span className="font-mono text-xs text-white/40 bg-white/5 px-2 py-1 rounded">0xA7F...92C</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                     <span className="text-sm font-medium text-white/70">P2P Port Allocation</span>
                     <span className="font-mono text-xs text-white/40 bg-white/5 px-2 py-1 rounded">8080 (TCP)</span>
                  </div>
                  <div className="flex justify-between items-center pb-2">
                     <span className="text-sm font-medium text-white/70">Consensus Mode</span>
                     <span className="font-mono text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">Proof of Auth</span>
                  </div>
               </div>
            </div>
        </div>

      </div>
    </div>
  );
};

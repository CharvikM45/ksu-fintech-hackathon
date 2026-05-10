import React from 'react';
import { useAuth } from '@/lib/auth';
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet,
  Globe,
  Radio,
  Clock,
  CreditCard,
  BarChart3,
  TrendingUp,
  LineChart
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (page: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const generateRandomTransactions = () => {
    return Array.from({length: 5}).map((_, i) => (
      <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors rounded px-2">
         <div className="flex items-center gap-3">
            <div className={`size-8 rounded-full flex items-center justify-center ${i % 2 === 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {i % 2 === 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-white/90">{i % 2 === 0 ? 'Recv_Node_' : 'Sent_Node_'}{Math.random().toString(36).substr(2, 4).toUpperCase()}</span>
              <span className="font-mono text-[10px] text-white/40">{Math.floor(Math.random() * 59 + 1)}m ago</span>
            </div>
         </div>
         <span className={`font-mono text-sm font-bold ${i % 2 === 0 ? 'text-green-400' : 'text-white/80'}`}>
            {i % 2 === 0 ? '+' : '-'}${Math.floor(Math.random() * 400 + 10)}.00
         </span>
      </div>
    ));
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-up">
      {/* Complex Financial Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 relative">
        <div className="absolute -top-6 -left-6 w-12 h-12 border-t-2 border-l-2 border-white/20 opacity-50" />
        <div className="absolute -bottom-6 -right-6 w-12 h-12 border-b-2 border-r-2 border-white/20 opacity-50" />
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] font-mono text-blue-400 font-bold uppercase tracking-wider flex items-center gap-2">
               <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
               Financial Terminal
            </div>
            <span className="text-[10px] font-mono text-white/40">v1.2.4-stable-mesh</span>
          </div>
          <h1 className="text-5xl font-semibold text-white tracking-tight leading-none">Capital Center</h1>
        </div>

        <div className="flex flex-row items-center gap-4 w-full md:w-auto z-10">
           <div className="flex items-center gap-4 bg-white/[0.02] p-2 rounded-2xl border border-white/10 pr-6">
             <div className="size-12 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white text-xl">
               {user.name.charAt(0).toUpperCase()}
             </div>
             <div className="flex flex-col">
               <span className="text-sm font-bold text-white leading-none mb-1">{user.name}</span>
               <span className="text-[10px] font-bold text-white/40 leading-none font-mono tracking-widest">USR-{user.id.toString().padStart(6, '0')}</span>
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Main Liquidity Hub (Span 2) */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-8 relative overflow-hidden group flex flex-col justify-between min-h-[480px]">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#EADFD4]/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-[#EADFD4]/10 transition-colors duration-700" />
          
          <div className="relative z-10 flex-1">
            <div className="flex justify-between items-start mb-12">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl shadow-lg">
                  <Wallet className="size-6 text-white/80" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/70">Total Liquid Assets</h3>
                  <span className="font-mono text-[10px] text-white/40 opacity-70">SYNCED: SECURE</span>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center gap-2">
                <TrendingUp className="size-3" />
                <span className="text-xs font-bold">+14.2% MTD</span>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-7xl md:text-9xl font-semibold text-white tracking-tighter tabular-nums">
                {formatCurrency(user.balance)}
              </h2>
            </div>
            
            {/* Simulated Activity Graph */}
            <div className="w-full h-24 mt-8 flex items-end gap-1 opacity-60">
                {Array.from({length: 40}).map((_, i) => (
                    <div 
                        key={i} 
                        className={`w-full rounded-t-sm transition-all duration-500 ease-in-out ${Math.random() > 0.8 ? 'bg-indigo-400' : 'bg-white/20'}`} 
                        style={{ height: `${Math.max(10, Math.random() * 100)}%` }} 
                    />
                ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 relative z-10">
             <button onClick={() => onNavigate('send')} className="h-16 flex items-center justify-center gap-3 bg-white text-black hover:bg-neutral-200 font-bold text-lg rounded-2xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                <ArrowUpRight size={20} />
                Execute Transfer
             </button>
             <button onClick={() => onNavigate('receive')} className="h-16 flex items-center justify-center gap-3 bg-white/5 text-white border border-white/20 hover:bg-white/10 font-bold text-lg rounded-2xl transition-all">
                <ArrowDownRight size={20} />
                Generate Request
             </button>
          </div>
        </div>

        {/* Financial Analytics Sidebar */}
        <div className="flex flex-col gap-6">
           
          {/* 24H Capital Flow Module */}
          <div className="glass-card p-6 rounded-3xl flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-6 text-white/60">
               <BarChart3 size={18} className="text-white" />
               <h3 className="text-sm font-semibold text-white">24H Capital Flow</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-white/40">INFLOW</span>
                    <p className="font-mono text-lg font-bold text-green-400">+$1,240</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-white/40">OUTFLOW</span>
                    <p className="font-mono text-lg font-bold text-white/80">-$430</p>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-4 text-white/60 pt-4 border-t border-white/5">
               <LineChart size={18} className="text-white" />
               <h3 className="text-sm font-semibold text-white">Recent Settlements</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1 max-h-48">
                {generateRandomTransactions()}
            </div>
          </div>

          {/* Core System Routing */}
          <div className="glass-card p-6 rounded-3xl flex flex-col gap-3">
             <button onClick={() => onNavigate('network')} className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all group bg-white/[0.02]">
                 <div className="flex items-center gap-3">
                   <Radio size={18} className="text-blue-400" />
                   <span className="text-sm font-bold text-white/80 group-hover:text-white">Node Telemetry</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="font-mono text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">SYNCED</span>
                     <ArrowUpRight size={14} className="text-white/40 group-hover:text-white" />
                 </div>
             </button>

             <button onClick={() => onNavigate('pos')} className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all group bg-white/[0.02]">
                 <div className="flex items-center gap-3">
                   <CreditCard size={18} className="text-purple-400" />
                   <span className="text-sm font-bold text-white/80 group-hover:text-white">Vendor POS Terminal</span>
                 </div>
                 <ArrowUpRight size={14} className="text-white/40 group-hover:text-white" />
             </button>

             <button onClick={() => onNavigate('history')} className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all group bg-white/[0.02]">
                 <div className="flex items-center gap-3">
                   <Clock size={18} className="text-white/60" />
                   <span className="text-sm font-bold text-white/80 group-hover:text-white">Full Ledger Audit</span>
                 </div>
                 <ArrowUpRight size={14} className="text-white/40 group-hover:text-white" />
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};

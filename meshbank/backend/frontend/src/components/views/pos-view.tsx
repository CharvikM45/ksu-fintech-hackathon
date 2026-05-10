import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { 
 Store, 
 ChevronLeft, 
 Wifi, 
 WifiOff, 
 CheckCircle, 
 ShieldCheck,
 Zap,
 Tag,
 CreditCard,
 QrCode,
 Terminal as TerminalIcon,
 RefreshCcw,
 Calendar,
 Users,
 TrendingUp,
 Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const POSView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
 const { user, refreshUser } = useAuth();
 const [amount, setAmount] = useState('0');
 const [note, setNote] = useState('');
 const [isProcessing, setIsProcessing] = useState(false);
 const [isOnline, setIsOnline] = useState(true);
 const [success, setSuccess] = useState<any>(null);
 const [error, setError] = useState<string | null>(null);
 const [isVendor, setIsVendor] = useState(false);
 const [stats, setStats] = useState({
 totalRevenue: 0,
 totalTxns: 0,
 todayRevenue: 0,
 todaySales: 0
 });

 useEffect(() => {
 if (user) {
 setIsVendor(user.is_vendor);
 if (user.is_vendor) {
 fetchStats();
 }
 }
 }, [user]);

 useEffect(() => {
 const handleStatus = () => setIsOnline(navigator.onLine);
 window.addEventListener('online', handleStatus);
 window.addEventListener('offline', handleStatus);
 return () => {
 window.removeEventListener('online', handleStatus);
 window.removeEventListener('offline', handleStatus);
 };
 }, []);

 const fetchStats = async () => {
 if (!user) return;
 try {
 const response = await fetch(`http://localhost:5000/api/transactions/${user.id}`);
 const data = await response.json();
 if (data.transactions) {
 const received = data.transactions.filter((t: any) => t.direction === 'received');
 const today = new Date().toDateString();
 const todayTxns = received.filter((t: any) => new Date(t.created_at).toDateString() === today);
 
 setStats({
 totalRevenue: received.reduce((acc: number, t: any) => acc + t.amount, 0),
 totalTxns: received.length,
 todayRevenue: todayTxns.reduce((acc: number, t: any) => acc + t.amount, 0),
 todaySales: todayTxns.length
 });
 }
 } catch (error) {
 console.error('Failed to fetch POS stats', error);
 }
 };

 const handleToggleVendor = async () => {
 if (!user) return;
 setIsProcessing(true);
 try {
 const response = await fetch(`http://localhost:5000/api/user/${user.id}/toggle-vendor`, {
 method: 'POST'
 });
 const data = await response.json();
 if (data.success) {
 await refreshUser();
 setIsVendor(data.is_vendor === 1);
 }
 } catch (error) {
 console.error('Toggle vendor failed', error);
 } finally {
 setIsProcessing(false);
 }
 };

 const handleNumber = (num: string) => {
 if (amount === '0') setAmount(num);
 else if (amount.includes('.') && amount.split('.')[1].length >= 2) return;
 else setAmount(amount + num);
 };

 const handleDecimal = () => {
 if (!amount.includes('.')) setAmount(amount + '.');
 };

 const handleClear = () => setAmount('0');

 const handleCharge = async () => {
 if (!user || parseFloat(amount) <= 0) return;
 
 setIsProcessing(true);
 setError(null);
 try {
 const response = await fetch('http://localhost:5000/api/pos/charge', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 merchant_id: user.id,
 amount: parseFloat(amount),
 note
 }),
 });
 const data = await response.json();
 if (data.success) {
 setSuccess(data.transaction);
 await refreshUser();
 fetchStats();
 } else {
 setError(data.error || 'Transaction failed');
 }
 } catch (err) {
 setError('Terminal connection error');
 } finally {
 setIsProcessing(false);
 }
 };

 if (!user) return null;

 if (success) {
 return (
 <div className="max-w-md mx-auto px-6 py-24 text-center space-y-12 animate-fade-up">
 <div className="relative mx-auto w-32 h-32">
 <div className="absolute inset-0 bg-green-500/20 blur-3xl animate-pulse" />
 <div className="relative size-full glass-card border-green-500/30 flex items-center justify-center rounded-2xl shadow-lg">
 <CheckCircle className="size-16 text-green-500" strokeWidth={1} />
 </div>
 </div>
 
 <div className="space-y-3">
 <h2 className="text-4xl font-semibold tracking-tight text-white">Funds Secured</h2>
 <p className="text-xs text-muted-foreground font-semibold text-white/40">Terminal Session Finalized</p>
 </div>

 <div className="glass-card p-10 rounded-2xl text-left space-y-8 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl" />
 
 <div className="flex justify-between items-end border-b border-white/5 pb-6">
 <div>
 <span className="text-xs text-muted-foreground font-semibold text-white/50">Settlement Amount</span>
 <p className="text-5xl font-semibold tracking-tight text-white">${success.amount.toFixed(2)}</p>
 </div>
 <div className="text-right">
 <span className="text-xs text-muted-foreground font-semibold text-white/50">Auth ID</span>
 <p className="font-mono text-xs text-muted-foreground font-bold text-white/60">#{success.id.slice(-8).toUpperCase()}</p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-1">
 <span className="text-xs text-muted-foreground font-semibold text-white/40">Node Status</span>
 <p className="text-xs text-muted-foreground font-bold text-green-500 ">Broadcasted</p>
 </div>
 <div className="text-right space-y-1">
 <span className="text-xs text-muted-foreground font-semibold text-white/40">Protocol</span>
 <p className="text-xs text-muted-foreground font-bold text-white ">MB-v1.2</p>
 </div>
 </div>
 </div>

 <Button 
 className="w-full py-10 text-xl font-semibold bg-primary text-secondary rounded-2xl shadow-2xl hover:shadow-glow-cream transition-all" 
 onClick={() => { setSuccess(null); setAmount('0'); setNote(''); }}
 >
 New Sale
 </Button>
 </div>
 );
 }

 return (
 <div className="max-w-5xl mx-auto px-6 py-12 animate-fade-up">
 <button 
 onClick={onBack}
 className="group flex items-center gap-3 text-white/60 font-semibold text-xs text-muted-foreground mb-12 hover:text-white transition-all"
 >
 <div className="size-8 rounded-full border border-white/5 flex items-center justify-center group-hover:border-white/20 transition-all">
 <ChevronLeft className="size-4" />
 </div>
 Back to Dashboard
 </button>

 <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
 <div className="space-y-2">
 <div className="flex items-center gap-3 text-white/50">
 <TerminalIcon size={16} />
 <span className="text-xs text-muted-foreground font-semibold ">Node Settlement Terminal</span>
 </div>
 <h1 className="text-6xl font-semibold tracking-tight text-white">POS Terminal</h1>
 <p className="text-xs text-muted-foreground font-semibold text-white/40">Merchant Mode • Autonomous Sync v1.2</p>
 </div>

 <div className="flex items-center gap-4 bg-white/[0.03] px-6 py-3 rounded-2xl border border-white/5">
 <span className="text-xs text-muted-foreground font-semibold text-white/60">Broadcasting Status</span>
 <div className="flex items-center gap-2">
 <div className={`size-2 rounded-full ${isOnline ? 'bg-green-500 shadow-xl' : 'bg-red-500'}`} />
 <span className={`text-xs text-muted-foreground font-semibold ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
 {isOnline ? 'Mesh Online' : 'Local Only'}
 </span>
 </div>
 </div>
 </div>

 {!isVendor ? (
 <div className="glass-card rounded-2xl p-24 text-center max-w-3xl mx-auto relative overflow-hidden group">
 <div className="absolute inset-0 bg-white/5 blur-[100px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
 <div className="size-32 mocha-gradient text-white p-8 rounded-2xl shadow-lg mx-auto mb-10 transform group-hover:scale-110 transition-transform duration-700">
 <Store size={64} strokeWidth={1.5} />
 </div>
 <div className="space-y-4 mb-12">
 <h2 className="text-4xl font-semibold tracking-tight text-white">Execute Merchant Protocol</h2>
 <p className="text-sm font-bold text-white/50 leading-relaxed max-w-md mx-auto ">
 Provision your node for high-throughput commercial settlement. Enable real-time inventory and peer discovery infrastructure.
 </p>
 </div>
 <Button 
 onClick={handleToggleVendor} 
 disabled={isProcessing} 
 className="py-10 px-12 text-xl font-semibold bg-primary text-secondary rounded-2xl shadow-2xl hover:shadow-glow-cream transition-all active:scale-95"
 >
 Initialize Merchant Node
 </Button>
 </div>
 ) : (
 <div className="grid lg:grid-cols-[1fr_380px] gap-12">
 <div className="glass-card rounded-2xl p-10 relative overflow-hidden flex flex-col">
 <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 blur-[100px] pointer-events-none" />
 
 <div className="bg-[#1a1715] rounded-2xl p-10 border border-white/5 mb-10 text-right relative group shadow-inner">
 <div className="absolute left-8 top-1/2 -translate-y-1/2 font-semibold text-5xl text-white/5 group-focus-within:text-white/40 transition-all">$</div>
 <div className="text-8xl font-semibold tracking-tight text-white text-glow-mocha leading-none">
 {amount}
 </div>
 <div className="mt-6 flex justify-end gap-3 items-center">
 <Tag size={14} className="text-white/40" />
 <input 
 type="text" 
 placeholder="SETTLEMENT NOTE..." 
 value={note}
 onChange={(e) => setNote(e.target.value)}
 className="bg-transparent border-none text-right text-xs text-muted-foreground font-semibold text-white/60 focus:text-white focus:outline-none placeholder:text-white/5 w-full"
 />
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4 mb-10 flex-1">
 {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'C'].map((val) => (
 <button
 key={val}
 onClick={() => {
 if (val === 'C') handleClear();
 else if (val === '.') handleDecimal();
 else handleNumber(val.toString());
 }}
 className={`flex items-center justify-center p-8 rounded-2xl text-3xl font-semibold transition-all group relative overflow-hidden ${
 val === 'C' 
 ? 'bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-500' 
 : 'bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white border border-white/5 active:bg-primary active:text-secondary'
 }`}
 >
 <span className="relative z-10">{val}</span>
 {val !== 'C' && (
 <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/0 group-hover:bg-white/10 transition-all" />
 )}
 </button>
 ))}
 </div>

 {error && (
 <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl text-xs text-muted-foreground font-semibold text-center mb-8 animate-shake">
 {error}
 </div>
 )}

 <Button 
 onClick={handleCharge}
 disabled={isProcessing || parseFloat(amount) <= 0}
 className="w-full py-12 text-2xl font-semibold bg-primary text-secondary rounded-2xl shadow-2xl hover:shadow-glow-cream transition-all group overflow-hidden relative"
 >
 <span className={isProcessing ? 'opacity-0' : 'opacity-100 flex items-center justify-center gap-4'}>
 {isProcessing ? 'Synchronizing...' : (
 <>
 Execute Settlement <Zap className="size-6 animate-pulse" />
 </>
 )}
 </span>
 {isProcessing && (
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="size-8 border border-white/10 border-secondary/20 border-t-secondary rounded-full animate-spin" />
 </div>
 )}
 </Button>
 </div>

 <div className="space-y-8">
 <div className="grid grid-cols-2 gap-4">
 {[
 { label: 'Cumulative Revenue', value: stats.totalRevenue, icon: TrendingUp, color: 'text-white' },
 { label: 'Settlement Count', value: stats.totalTxns, icon: TerminalIcon, color: 'text-white/70' },
 { label: 'Cycle Yield', value: stats.todayRevenue, icon: Zap, color: 'text-green-500' },
 { label: 'Peer Contacts', value: stats.todaySales, icon: Users, color: 'text-white/60' },
 ].map((stat, i) => (
 <div key={i} className="glass-card p-6 rounded-2xl border border-white/5 hover:bg-white/[0.05] transition-all">
 <div className={`p-2 rounded-lg bg-white/5 w-fit mb-4 ${stat.color}`}>
 <stat.icon size={16} />
 </div>
 <p className="text-2xl font-semibold tracking-tight text-white">
 {typeof stat.value === 'number' && i !== 1 && i !== 3 ? `$${stat.value.toLocaleString()}` : stat.value}
 </p>
 <p className="text-xs text-muted-foreground font-semibold text-white/40 mt-1">{stat.label}</p>
 </div>
 ))}
 </div>

 <div className="glass-card p-10 rounded-2xl relative overflow-hidden bg-primary shadow-2xl">
 <div className="relative z-10 space-y-6">
 <div className="flex items-center gap-4">
 <div className="size-12 bg-secondary/10 border border-secondary/20 rounded-2xl flex items-center justify-center text-secondary">
 <ShieldCheck size={24} />
 </div>
 <h3 className="text-xl font-semibold text-secondary tracking-tight text-glow-cream">Node Config</h3>
 </div>
 <div className="space-y-3">
 <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold text-secondary/40">
 <span>Merchant Identity</span>
 <span className="text-secondary/70">Verified Protocol</span>
 </div>
 <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold text-secondary/40">
 <span>Edge Mesh Mode</span>
 <span className="text-secondary/70">Autonomous</span>
 </div>
 </div>
 <Button 
 className="w-full bg-secondary text-white font-semibold text-xs text-muted-foreground py-8 rounded-2xl hover:bg-secondary/90 transition-all border-none"
 onClick={handleToggleVendor}
 >
 Deactivate Terminal
 </Button>
 </div>
 <TerminalIcon className="absolute -right-12 -bottom-12 size-64 opacity-5 -rotate-12 text-secondary" />
 </div>

 <div className="p-8 glass-card rounded-2xl border-dashed border-white/10 opacity-60">
 <div className="flex items-center gap-3 mb-4">
 <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center">
 <Tag className="size-4 text-white/60" />
 </div>
 <span className="text-xs text-muted-foreground font-semibold text-white/50">Tax Compliance</span>
 </div>
 <p className="text-xs text-muted-foreground font-bold text-white/40 leading-relaxed r">
 Settlements processed in offline mode will automatically reconcile when the node re-enters mesh range.
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

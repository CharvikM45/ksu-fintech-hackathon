import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { 
 Wallet, 
 Plus, 
 ChevronLeft,
 ShieldCheck,
 CreditCard,
 Zap,
 ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WalletViewProps {
 onBack: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ onBack }) => {
 const { user, refreshUser } = useAuth();
 const [depositAmount, setDepositAmount] = useState('');
 const [isProcessing, setIsProcessing] = useState(false);
 const [success, setSuccess] = useState<string | null>(null);

 const handleDeposit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!user || !depositAmount) return;

 setIsProcessing(true);
 try {
 const response = await fetch('http://localhost:5000/api/deposit', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ user_id: user.id, amount: parseFloat(depositAmount) }),
 });
 const data = await response.json();
 if (data.success) {
 await refreshUser();
 setSuccess(`Successfully added $${parseFloat(depositAmount).toFixed(2)} to your wallet!`);
 setDepositAmount('');
 setTimeout(() => setSuccess(null), 5000);
 }
 } catch (error) {
 console.error('Deposit failed', error);
 } finally {
 setIsProcessing(false);
 }
 };

 const formatCurrency = (amount: number) => {
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: 'USD',
 }).format(amount);
 };

 if (!user) return null;

 return (
 <div className="max-w-2xl mx-auto px-6 py-12 animate-fade-up">
 <button 
 onClick={onBack}
 className="group flex items-center gap-3 text-white/60 font-semibold text-xs text-muted-foreground mb-12 hover:text-white transition-all"
 >
 <div className="size-8 rounded-full border border-white/5 flex items-center justify-center group-hover:border-white/20 transition-all">
 <ChevronLeft className="size-4" />
 </div>
 Back to Dashboard
 </button>

 <div className="glass-card rounded-2xl p-10 relative overflow-hidden">
 {/* Glow Effect */}
 <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] pointer-events-none" />

 <div className="flex items-center justify-between mb-12">
 <div className="flex items-center gap-5">
 <div className="mocha-gradient text-white p-4 rounded-2xl shadow-lg">
 <Wallet size={32} strokeWidth={2} />
 </div>
 <div className="space-y-1">
 <h1 className="text-4xl font-semibold tracking-tight text-white leading-none">My Wallet</h1>
 <p className="text-xs text-muted-foreground font-semibold text-white/40">Secure Node Ledger v1.2</p>
 </div>
 </div>
 <div className="hidden md:block">
 <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
 <ShieldCheck size={14} className="text-white/60" />
 <span className="text-xs text-muted-foreground font-semibold text-white/50">Verified Node</span>
 </div>
 </div>
 </div>

 <div className="bg-[#1a1715] rounded-2xl p-10 border border-white/5 flex flex-col items-center text-center relative group">
 <div className="absolute top-4 left-4">
 <Zap size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
 </div>
 <span className="text-xs text-muted-foreground font-semibold text-white/40 mb-4">Available Liquidity</span>
 <h2 className="text-6xl font-semibold tracking-tight text-white">
 {formatCurrency(user.balance)}
 </h2>
 </div>

 <div className="mt-12 space-y-6">
 <div className="flex items-center justify-between px-2">
 <h3 className="text-xs font-semibold text-white/60 flex items-center gap-2">
 Inject Capital
 </h3>
 <span className="text-xs text-muted-foreground font-bold text-white/40 ">Instant Settlement</span>
 </div>
 
 <form onSubmit={handleDeposit} className="space-y-6">
 <div className="relative group">
 <span className="absolute left-6 top-1/2 -translate-y-1/2 font-semibold text-3xl text-white/20 group-focus-within:text-white/50 transition-colors">$</span>
 <input
 type="number"
 value={depositAmount}
 onChange={(e) => setDepositAmount(e.target.value)}
 placeholder="0.00"
 step="0.01"
 min="0.01"
 required
 className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-8 py-8 text-4xl font-semibold focus:border-primary/30 outline-none transition-all placeholder:text-white/5 focus:bg-white/[0.05]"
 />
 </div>

 {success && (
 <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-6 rounded-2xl text-xs text-muted-foreground font-semibold text-center animate-fade-up">
 {success}
 </div>
 )}

 <Button 
 type="submit" 
 disabled={isProcessing}
 className="w-full py-10 text-xl font-semibold bg-primary text-secondary rounded-2xl shadow-2xl hover:shadow-glow-cream transition-all active:scale-[0.98]"
 >
 {isProcessing ? 'Synchronizing...' : 'Initialize Deposit'}
 </Button>
 </form>
 </div>

 <div className="mt-10 pt-10 border-t border-white/5 grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-2 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
 <div className="flex items-center gap-2">
 <CreditCard size={14} className="text-white/50" />
 <span className="text-xs text-muted-foreground font-semibold text-white/60">Network Status</span>
 </div>
 <p className="text-xs text-muted-foreground font-bold text-white ">Autonomous Sync Enabled</p>
 </div>
 <div className="flex flex-col gap-2 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
 <div className="flex items-center gap-2">
 <ArrowUpRight size={14} className="text-white/50" />
 <span className="text-xs text-muted-foreground font-semibold text-white/60">Total Volume</span>
 </div>
 <p className="text-xs text-muted-foreground font-bold text-white ">Processing Tier: Alpha</p>
 </div>
 </div>
 </div>
 </div>
 );
};

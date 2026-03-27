import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { 
 Send, 
 ChevronLeft,
 Phone,
 DollarSign, 
 PenTool,
 Lock,
 CheckCircle,
 QrCode,
 Shield,
 Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TransferViewProps {
 onBack: () => void;
}

export const TransferView: React.FC<TransferViewProps> = ({ onBack }) => {
 const { user, refreshUser } = useAuth();
 const [recipientPhone, setRecipientPhone] = useState('');
 const [amount, setAmount] = useState('');
 const [note, setNote] = useState('');
 const [pin, setPin] = useState('');
 
 const [isProcessing, setIsProcessing] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [success, setSuccess] = useState<any>(null);

 const handleTransfer = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!user) return;

 setIsProcessing(true);
 setError(null);

 try {
 const response = await fetch('http://localhost:5000/api/transfer', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 sender_id: user.id,
 receiver_phone: recipientPhone,
 amount: parseFloat(amount),
 pin,
 note
 }),
 });
 const data = await response.json();
 
 if (data.success) {
 setSuccess(data.transaction);
 await refreshUser();
 } else {
 setError(data.error || 'Transfer failed');
 }
 } catch (err) {
 setError('Connection to offline network lost');
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
 <h2 className="text-4xl font-semibold tracking-tight text-white">Protocol Executed</h2>
 <p className="text-xs text-muted-foreground font-semibold text-white/40">Cryptographic Handshake Successful</p>
 </div>

 <div className="glass-card p-8 rounded-2xl text-left space-y-6 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl" />
 
 <div className="flex justify-between items-end border-b border-white/5 pb-4">
 <div className="space-y-1">
 <span className="text-xs text-muted-foreground font-semibold text-white/50">Recipient Node</span>
 <p className="font-semibold text-sm tracking-tight text-white">{success.receiver}</p>
 </div>
 <div className="text-right">
 <span className="text-xs text-muted-foreground font-semibold text-white/50">Settlement</span>
 <p className="text-2xl font-semibold tracking-tight text-green-500">-${success.amount.toFixed(2)}</p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <span className="text-xs text-muted-foreground font-semibold text-white/40">Network Hash</span>
 <p className="font-mono text-xs text-muted-foreground font-bold text-white/60 truncate">{success.id}</p>
 </div>
 <div className="text-right space-y-1">
 <span className="text-xs text-muted-foreground font-semibold text-white/40">Status</span>
 <div className="flex justify-end">
 <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-xs text-muted-foreground font-semibold border border-green-500/20">
 {success.status}
 </span>
 </div>
 </div>
 </div>
 </div>

 <Button 
 className="w-full py-10 text-xl font-semibold bg-primary text-secondary rounded-2xl shadow-2xl hover:shadow-glow-cream transition-all" 
 onClick={onBack}
 >
 Return to Terminal
 </Button>
 </div>
 );
 }

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
 <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 blur-[100px] pointer-events-none" />

 <div className="flex items-center gap-5 mb-12">
 <div className="mocha-gradient text-white p-4 rounded-2xl shadow-lg">
 <Send size={32} strokeWidth={2} />
 </div>
 <div className="space-y-1">
 <h1 className="text-4xl font-semibold tracking-tight text-white leading-none">P2P Transfer</h1>
 <p className="text-xs text-muted-foreground font-semibold text-white/40">Direct Cryptographic Exchange</p>
 </div>
 </div>

 <form onSubmit={handleTransfer} className="space-y-8">
 <div className="grid md:grid-cols-2 gap-8">
 <div className="space-y-3">
 <label className="text-xs text-muted-foreground font-semibold text-white/60 ml-1 flex items-center gap-2">
 <Phone size={12} className="opacity-40" /> Peer Identity
 </label>
 <input
 type="tel"
 value={recipientPhone}
 onChange={(e) => setRecipientPhone(e.target.value)}
 placeholder="000-000-0000"
 required
 className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-5 font-bold focus:border-primary/30 outline-none transition-all placeholder:text-white/20 shadow-inner"
 />
 </div>

 <div className="space-y-3">
 <label className="text-xs text-muted-foreground font-semibold text-white/60 ml-1 flex items-center gap-2">
 <DollarSign size={12} className="opacity-40" /> Transfer Amount
 </label>
 <input
 type="number"
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 placeholder="0.00"
 step="0.01"
 min="0.01"
 required
 className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-5 font-semibold focus:border-primary/30 outline-none transition-all placeholder:text-white/20 shadow-inner"
 />
 </div>
 </div>

 <div className="space-y-3">
 <label className="text-xs text-muted-foreground font-semibold text-white/60 ml-1 flex items-center gap-2">
 <PenTool size={12} className="opacity-40" /> Protocol Note
 </label>
 <input
 type="text"
 value={note}
 onChange={(e) => setNote(e.target.value)}
 placeholder="Encrypted reference tag..."
 className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-5 font-bold focus:border-primary/30 outline-none transition-all placeholder:text-white/20 shadow-inner"
 />
 </div>

 <div className="pt-8 border-t border-white/5 space-y-4">
 <label className="text-xs text-muted-foreground font-semibold text-white/60 ml-1 flex items-center justify-center gap-2">
 <Lock size={12} className="opacity-40" /> Authorize with Node PIN
 </label>
 <input
 type="password"
 value={pin}
 onChange={(e) => setPin(e.target.value)}
 placeholder="••••"
 maxLength={6}
 required
 className="max-w-[240px] mx-auto block w-full bg-[#1a1715] border border-white/10 rounded-2xl px-6 py-6 font-semibold focus:border-primary/50 focus:shadow-lg outline-none transition-all placeholder:text-white/5 shadow-inner text-center text-2xl"
 />
 </div>

 {error && (
 <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl text-xs text-muted-foreground font-semibold text-center animate-shake">
 {error}
 </div>
 )}

 <Button 
 type="submit" 
 disabled={isProcessing}
 className="w-full py-10 text-xl font-semibold bg-primary text-secondary rounded-2xl shadow-2xl hover:shadow-glow-cream transition-all active:scale-[0.98]"
 >
 {isProcessing ? 'Validating Nodes...' : 'Execute Protocol'}
 </Button>
 </form>

 <div className="mt-8 flex items-center justify-center gap-8 opacity-40">
 <div className="flex items-center gap-2">
 <Shield size={14} />
 <span className="text-xs text-muted-foreground font-semibold ">End-to-End</span>
 </div>
 <div className="flex items-center gap-2">
 <Zap size={14} />
 <span className="text-xs text-muted-foreground font-semibold ">Sub-Second</span>
 </div>
 <div className="flex items-center gap-2">
 <QrCode size={14} />
 <span className="text-xs text-muted-foreground font-semibold ">Mesh Link</span>
 </div>
 </div>
 </div>
 </div>
 );
};

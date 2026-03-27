import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { 
 ChevronLeft, 
 ArrowUpRight, 
 ArrowDownLeft, 
 Search, 
 Download,
 Receipt,
 Filter,
 Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Transaction {
 id: string;
 amount: number;
 type: string;
 status: string;
 direction: 'sent' | 'received';
 sender_name: string;
 receiver_name: string;
 created_at: string;
 note?: string;
}

export const HistoryView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
 const { user } = useAuth();
 const [transactions, setTransactions] = useState<Transaction[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
 const [search, setSearch] = useState('');

 useEffect(() => {
 const fetchHistory = async () => {
 if (!user) return;
 try {
 const response = await fetch(`http://localhost:5000/api/transactions/${user.id}`);
 const data = await response.json();
 if (data.transactions) {
 setTransactions(data.transactions);
 }
 } catch (error) {
 console.error('Failed to fetch transaction history', error);
 } finally {
 setIsLoading(false);
 }
 };

 fetchHistory();
 }, [user]);

 const filteredTransactions = transactions.filter(txn => {
 const matchesFilter = filter === 'all' || txn.direction === filter;
 const matchesSearch = 
 txn.receiver_name.toLowerCase().includes(search.toLowerCase()) ||
 txn.sender_name.toLowerCase().includes(search.toLowerCase()) ||
 txn.id.toLowerCase().includes(search.toLowerCase()) ||
 (txn.note && txn.note.toLowerCase().includes(search.toLowerCase()));
 return matchesFilter && matchesSearch;
 });

 const formatCurrency = (amount: number) => {
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: 'USD',
 }).format(amount);
 };

 if (!user) return null;

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
 <Activity size={16} />
 <span className="text-xs text-muted-foreground font-semibold ">Node Analytics</span>
 </div>
 <h1 className="text-6xl font-semibold tracking-tight text-white">History</h1>
 <p className="text-xs text-muted-foreground font-semibold text-white/40">Audit Trail • {transactions.length} Verified Entries</p>
 </div>

 <div className="flex flex-wrap gap-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
 {(['all', 'sent', 'received'] as const).map((f) => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={`px-6 py-2.5 rounded-xl text-xs text-muted-foreground font-semibold tracking-[.2em] transition-all ${
 filter === f 
 ? 'bg-primary text-secondary shadow-2xl' 
 : 'text-white/50 hover:text-white/70'
 }`}
 >
 {f}
 </button>
 ))}
 </div>
 </div>

 <div className="grid lg:grid-cols-[1fr_300px] gap-12">
 <div className="space-y-6">
 <div className="relative group">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-white/20 group-focus-within:text-white/50 transition-colors" />
 <input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Query sequence hash or identity..."
 className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-8 py-6 font-bold focus:border-white/20 outline-none transition-all placeholder:text-white/5 focus:bg-white/[0.05]"
 />
 </div>

 <div className="space-y-3">
 {isLoading ? (
 <div className="p-24 text-center glass-card rounded-2xl">
 <div className="size-12 border border-white/10 border-white/20 border-t-primary rounded-full animate-spin mx-auto mb-6" />
 <p className="font-semibold text-white/20 text-xs">Accessing Ledger...</p>
 </div>
 ) : filteredTransactions.length === 0 ? (
 <div className="glass-card rounded-2xl p-24 text-center border-dashed border-white/5">
 <p className="font-semibold text-white/20 ">Null result for specified parameters</p>
 </div>
 ) : (
 filteredTransactions.map((txn) => (
 <div 
 key={txn.id}
 className="flex items-center justify-between p-6 glass-card rounded-2xl hover:bg-white/[0.05] transition-all group relative overflow-hidden"
 >
 <div className="flex items-center gap-5 relative z-10">
 <div className={`size-14 flex items-center justify-center rounded-2xl border border-white/5 ${txn.direction === 'sent' ? 'bg-white/5 text-white/60' : 'bg-green-500/5 text-green-500/40'}`}>
 {txn.direction === 'sent' ? <ArrowUpRight className="size-6" strokeWidth={1.5} /> : <ArrowDownLeft className="size-6" strokeWidth={1.5} />}
 </div>
 <div>
 <div className="flex items-center gap-3">
 <p className="font-semibold text-sm tracking-tight text-white">
 {txn.direction === 'sent' ? txn.receiver_name : txn.sender_name}
 </p>
 <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full font-semibold text-white/40 border border-white/5">
 {txn.type}
 </span>
 </div>
 <p className="text-xs text-muted-foreground font-bold text-white/40 mt-1.5 flex items-center gap-2">
 {new Date(txn.created_at).toLocaleDateString()} <span className="opacity-30">•</span> {txn.id.split('-')[0]}...{txn.id.slice(-4)}
 </p>
 {txn.note && (
 <p className="text-xs text-muted-foreground font-bold text-white/60 mt-3 bg-primary/[0.02] px-3 py-1.5 rounded-lg border-l border-white/10">
 {txn.note}
 </p>
 )}
 </div>
 </div>
 <div className="flex flex-col items-end gap-3 relative z-10">
 <p className={`text-2xl font-semibold tracking-tight ${txn.direction === 'sent' ? 'text-white' : 'text-green-500'}`}>
 {txn.direction === 'sent' ? '-' : '+'}{formatCurrency(txn.amount)}
 </p>
 <button className="opacity-0 group-hover:opacity-100 p-2.5 bg-white/5 rounded-xl border border-white/10 hover:border-primary/30 transition-all">
 <Receipt className="size-4 text-white/60" />
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 <div className="space-y-8">
 <div className="glass-card p-10 rounded-2xl relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl" />
 <h3 className="text-xl font-semibold tracking-tight text-white mb-8 border-b border-white/5 pb-4">Summaries</h3>
 <div className="space-y-6">
 <div className="space-y-1">
 <span className="text-xs text-muted-foreground font-semibold text-white/40">Total Liquidity Export</span>
 <p className="text-2xl font-semibold text-white">
 ${transactions.filter(t => t.direction === 'sent').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
 </p>
 </div>
 <div className="space-y-1">
 <span className="text-xs text-muted-foreground font-semibold text-white/40">Total Liquidity Import</span>
 <p className="text-2xl font-semibold text-green-500">
 ${transactions.filter(t => t.direction === 'received').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
 </p>
 </div>
 </div>
 <Button className="w-full mt-12 bg-primary text-secondary font-semibold text-xs py-8 rounded-2xl shadow-2xl hover:shadow-glow-cream transition-all">
 <Download className="size-4 mr-3" /> Export Ledger
 </Button>
 </div>
 
 <div className="p-8 glass-card rounded-2xl border-dashed border-white/5 opacity-60">
 <div className="flex items-center gap-3 mb-4">
 <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center">
 <Filter className="size-4 text-white/60" />
 </div>
 <span className="text-xs text-muted-foreground font-semibold text-white/50">Node Protocol</span>
 </div>
 <p className="text-xs text-muted-foreground font-bold text-white/40 leading-relaxed r">
 All transactions are cryptographically signed by your private key and validated by reaching consensus across the mesh network nodes.
 </p>
 </div>
 </div>
 </div>
 </div>
 );
};

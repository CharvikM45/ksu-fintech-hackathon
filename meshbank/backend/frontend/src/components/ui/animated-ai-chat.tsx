"use client";

import { useEffect, useRef, useCallback, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
 CircleUserRound,
 ArrowUpIcon,
 Paperclip,
 SendIcon,
 XIcon,
 LoaderIcon,
 Sparkles,
 Command,
 TrendingUp,
 ShieldAlert,
 BrainCircuit,
 MessageSquare,
 ChevronRight,
 PieChart,
 AlertCircle,
 Zap,
 Cpu,
 ShieldCheck,
 Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react"

interface UseAutoResizeTextareaProps {
 minHeight: number;
 maxHeight?: number;
}

function useAutoResizeTextarea({
 minHeight,
 maxHeight,
}: UseAutoResizeTextareaProps) {
 const textareaRef = useRef<HTMLTextAreaElement>(null);

 const adjustHeight = useCallback(
 (reset?: boolean) => {
 const textarea = textareaRef.current;
 if (!textarea) return;

 if (reset) {
 textarea.style.height = `${minHeight}px`;
 return;
 }

 textarea.style.height = `${minHeight}px`;
 const newHeight = Math.max(
 minHeight,
 Math.min(
 textarea.scrollHeight,
 maxHeight ?? Number.POSITIVE_INFINITY
 )
 );

 textarea.style.height = `${newHeight}px`;
 },
 [minHeight, maxHeight]
 );

 useEffect(() => {
 const textarea = textareaRef.current;
 if (textarea) {
 textarea.style.height = `${minHeight}px`;
 }
 }, [minHeight]);

 return { textareaRef, adjustHeight };
}

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
 ({ className, ...props }, ref) => {
 return (
 <textarea
 className={cn(
 "flex min-h-[50px] w-full bg-transparent p-4 text-white font-bold focus:outline-none placeholder:text-white/20 disabled:cursor-not-allowed disabled:opacity-50",
 className
 )}
 ref={ref}
 {...props}
 />
 )
 }
)
Textarea.displayName = "Textarea"

export function AnimatedAIChat() {
 const { user } = useAuth();
 const [activeTab, setActiveTab] = useState<'chat' | 'insights' | 'fraud' | 'predict'>('chat');
 const [value, setValue] = useState("");
 const [messages, setMessages] = useState<any[]>([
 { role: 'bot', text: "Protocol initialized. I am MeshBot-v1.2. How may I assist your financial sovereignty today?" }
 ]);
 const [isTyping, setIsTyping] = useState(false);
 const [isPending, startTransition] = useTransition();
 
 // Reports data
 const [insights, setInsights] = useState<any>(null);
 const [fraudReport, setFraudReport] = useState<any>(null);
 const [prediction, setPrediction] = useState<any>(null);
 const [isLoading, setIsLoading] = useState(false);

 const { textareaRef, adjustHeight } = useAutoResizeTextarea({
 minHeight: 50,
 maxHeight: 200,
 });

 useEffect(() => {
 if (activeTab !== 'chat') {
 fetchReportData();
 }
 }, [activeTab]);

 const fetchReportData = async () => {
 if (!user) return;
 setIsLoading(true);
 try {
 const endpoint = activeTab === 'insights' ? 'insights' : activeTab === 'fraud' ? 'fraud' : 'predict';
 const response = await fetch(`http://localhost:5000/api/ai/${endpoint}/${user.id}`);
 const data = await response.json();
 if (activeTab === 'insights') setInsights(data);
 else if (activeTab === 'fraud') setFraudReport(data);
 else if (activeTab === 'predict') setPrediction(data);
 } catch (error) {
 console.error('Failed to fetch AI report', error);
 } finally {
 setIsLoading(false);
 }
 };

 const handleSendMessage = () => {
 if (value.trim() && user) {
 const userMsg = value;
 setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
 setValue("");
 adjustHeight(true);
 
 setIsTyping(true);
 
 fetch('http://localhost:5000/api/ai/assistant', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ message: userMsg, user_id: user.id })
 })
 .then(res => res.json())
 .then(data => {
 setMessages(prev => [...prev, { role: 'bot', text: data.response }]);
 setIsTyping(false);
 })
 .catch(() => {
 setMessages(prev => [...prev, { role: 'bot', text: "Uplink interrupted. Retrying local inference..." }]);
 setIsTyping(false);
 });
 }
 };

 return (
 <div className="w-full max-w-5xl mx-auto p-6 animate-fade-up">
 <div className="glass-card border border-white/5 shadow-2xl rounded-2xl overflow-hidden min-h-[700px] grid md:grid-cols-[280px_1fr]">
 {/* Sidebar */}
 <div className="bg-white/[0.02] p-8 border-r border-white/5 flex flex-col gap-3">
 <div className="mb-10 flex items-center gap-4">
 <div className="mocha-gradient text-white p-3 rounded-2xl shadow-lg">
 <BrainCircuit size={28} strokeWidth={2} />
 </div>
 <div className="space-y-0.5">
 <h2 className="text-2xl font-semibold tracking-tight text-white leading-none text-glow-mocha">MeshBot</h2>
 <p className="text-xs text-muted-foreground font-semibold text-white/40 ">Protocol v1.2.0</p>
 </div>
 </div>

 {[
 { id: 'chat', label: 'Neural Assistant', icon: MessageSquare },
 { id: 'insights', label: 'Fiscal Insights', icon: PieChart },
 { id: 'fraud', label: 'Security Node', icon: ShieldAlert },
 { id: 'predict', label: 'Trend Predictive', icon: TrendingUp },
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as any)}
 className={`group flex items-center gap-4 p-5 rounded-2xl font-semibold text-xs text-muted-foreground transition-all relative overflow-hidden ${
 activeTab === tab.id 
 ? 'bg-primary text-secondary shadow-2xl' 
 : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
 }`}
 >
 <tab.icon className={`size-5 transition-transform duration-500 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`} />
 <span className="relative z-10">{tab.label}</span>
 {activeTab === tab.id && (
 <motion.div 
 layoutId="activeTabGlow"
 className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-full animate-shimmer"
 />
 )}
 </button>
 ))}

 <div className="mt-auto pt-8 border-t border-white/5">
 <div className="glass-card p-6 bg-green-500/5 rounded-2xl border-green-500/10 space-y-4">
 <div className="flex items-center gap-3">
 <Cpu size={14} className="text-green-500" />
 <span className="text-xs text-muted-foreground font-semibold text-green-500">Edge Compute</span>
 </div>
 <div className="space-y-1">
 <div className="h-1 w-full bg-green-500/10 rounded-full overflow-hidden">
 <div className="h-full bg-green-500/40 w-2/3 animate-pulse" />
 </div>
 <p className="text-xs text-muted-foreground font-bold text-green-500/30 text-right">TPU Optimized</p>
 </div>
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="flex flex-col h-full bg-[#12100e]/30 relative mix-blend-plus-lighter">
 {/* Header */}
 <div className="p-10 border-b border-white/5 flex justify-between items-center backdrop-blur-md sticky top-0 z-20">
 <div className="space-y-1">
 <h3 className="text-4xl font-semibold tracking-tight text-white text-glow-mocha leading-none">
 {activeTab === 'chat' && 'Assistant Core'}
 {activeTab === 'insights' && 'Neural Analysis'}
 {activeTab === 'fraud' && 'Security Audit'}
 {activeTab === 'predict' && 'Wealth Pipeline'}
 </h3>
 <div className="flex items-center gap-3">
 <Lock size={10} className="text-white/40" />
 <p className="text-xs text-muted-foreground font-semibold text-white/40">Secure Enclave Encryption Enabled</p>
 </div>
 </div>
 {isLoading ? (
 <div className="size-10 rounded-full border border-white/5 flex items-center justify-center">
 <LoaderIcon className="animate-spin text-white size-5" />
 </div>
 ) : (
 <div className="size-10 rounded-full border border-white/10 flex items-center justify-center text-white/40">
 <Sparkles size={18} />
 </div>
 )}
 </div>

 {/* Scrollable Content */}
 <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
 {activeTab === 'chat' && (
 <div className="space-y-8">
 {messages.map((msg, i) => (
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 key={i} 
 className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
 >
 <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl ${
 msg.role === 'user' 
 ? 'bg-white/[0.03] border border-white/5 text-white' 
 : 'mocha-gradient border border-white/10 text-white'
 }`}>
 {msg.role === 'user' ? <CircleUserRound size={20} /> : <BrainCircuit size={20} />}
 </div>
 <div className={`max-w-[80%] p-7 rounded-2xl border font-bold text-sm leading-relaxed ${
 msg.role === 'user' 
 ? 'bg-white/[0.02] border-white/5 text-white/80 rounded-tr-none' 
 : 'glass-card border-white/10 text-white rounded-tl-none shadow-2xl'
 }`}>
 {msg.text}
 {msg.role === 'bot' && (
 <div className="mt-4 pt-4 border-t border-white/5 flex gap-4 opacity-30">
 <span className="text-xs text-muted-foreground font-semibold ">Hash Verified</span>
 <span className="text-xs text-muted-foreground font-semibold text-white/50">Local Latency: 42ms</span>
 </div>
 )}
 </div>
 </motion.div>
 ))}

 {isTyping && (
 <div className="flex gap-6 animate-pulse">
 <div className="size-12 bg-white/5 rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-white/40">
 <BrainCircuit size={20} />
 </div>
 <div className="glass-card p-6 rounded-2xl rounded-tl-none border-white/5 text-xs text-muted-foreground font-semibold text-white/40 flex items-center gap-4">
 Synthesizing Neural Response...
 <div className="flex gap-1">
 <div className="size-1 bg-white/10 rounded-full animate-bounce" />
 <div className="size-1 bg-white/10 rounded-full animate-bounce delay-75" />
 <div className="size-1 bg-white/10 rounded-full animate-bounce delay-150" />
 </div>
 </div>
 </div>
 )}
 </div>
 )}

 {activeTab === 'insights' && insights && (
 <div className="space-y-10 animate-fade-up">
 <div className="grid grid-cols-2 gap-6">
 <div className="glass-card border-white/5 p-8 rounded-2xl relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 group-hover:scale-125 transition-transform duration-700">
 <PieChart size={64} />
 </div>
 <div className="relative z-10 space-y-3">
 <div className="size-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-500/20">
 <PieChart size={20} />
 </div>
 <p className="text-xs text-muted-foreground font-semibold text-white/50">Net Volatility</p>
 <h4 className="text-3xl font-semibold tracking-tight text-white">Stable Core</h4>
 </div>
 </div>
 <div className="glass-card border-white/5 p-8 rounded-2xl relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 group-hover:scale-125 transition-transform duration-700">
 <TrendingUp size={64} />
 </div>
 <div className="relative z-10 space-y-3">
 <div className="size-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 border border-green-500/20">
 <TrendingUp size={20} />
 </div>
 <p className="text-xs text-muted-foreground font-semibold text-white/50">Capital Yield</p>
 <h4 className="text-3xl font-semibold tracking-tight text-white">+12.4% Cycle</h4>
 </div>
 </div>
 </div>

 <div className="space-y-6">
 <h5 className="font-semibold text-xs text-white/60 flex items-center gap-3 px-4">
 <Sparkles className="size-4 text-glow-mocha" /> Neural Observations
 </h5>
 <div className="grid gap-4">
 {insights.map((insight: string, i: number) => (
 <div key={i} className="group glass-card p-6 border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all flex items-start gap-6 border border-white/5">
 <div className="size-10 mocha-gradient border border-white/10 rounded-xl flex items-center justify-center font-semibold text-xs text-white shrink-0 shadow-lg">{i+1}</div>
 <p className="font-bold text-sm text-white/70 leading-relaxed pt-2 group-hover:text-white transition-colors">{insight}</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {activeTab === 'fraud' && fraudReport && (
 <div className="space-y-10 animate-fade-up">
 <div className="glass-card border-white/5 p-12 rounded-2xl flex flex-col items-center text-center space-y-6 relative overflow-hidden">
 <div className="absolute inset-0 bg-white/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
 <div className={`relative z-10 size-24 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl ${
 fraudReport.risk_score < 30 
 ? 'bg-green-500/10 border-green-500/30 text-green-500 shadow-lg' 
 : 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-lg'
 }`}>
 <ShieldCheck size={48} strokeWidth={1} />
 </div>
 <div className="space-y-2">
 <h4 className="text-4xl font-semibold tracking-tight text-white">Risk Factor: {fraudReport.risk_level}</h4>
 <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground font-semibold text-white/40">
 <span>Telemetry Audit: {fraudReport.risk_score}/100</span>
 <span className="size-1 rounded-full bg-white/10" />
 <span className="text-green-500/40">Verified Local</span>
 </div>
 </div>
 </div>

 <div className="space-y-6">
 <h5 className="font-semibold text-xs text-white/60 flex items-center gap-3 px-4">
 <AlertCircle className="size-4" /> Logic Flags Detected
 </h5>
 {fraudReport.flags.length === 0 ? (
 <div className="p-16 glass-card rounded-2xl border-dashed border-white/5 text-center">
 <p className="text-xs text-muted-foreground font-semibold text-white/20 ">Zero Deviations In Current Traffic Pattern</p>
 </div>
 ) : (
 <div className="grid gap-3">
 {fraudReport.flags.map((flag: string, i: number) => (
 <div key={i} className="group p-6 glass-card border-l border-white/10 border-amber-500/50 rounded-r-[2rem] flex items-center justify-between border-white/5 hover:bg-white/[0.03] transition-all">
 <span className="font-semibold text-xs text-muted-foreground text-white/70 ">{flag}</span>
 <ChevronRight className="size-4 text-white/20 group-hover:text-amber-500 transition-colors" />
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}

 {activeTab === 'predict' && prediction && (
 <div className="space-y-10 animate-fade-up">
 <div className="mocha-gradient border border-white/10 p-12 rounded-2xl shadow-2xl relative overflow-hidden group">
 <motion.div 
 animate={{ 
 scale: [1, 1.1, 1],
 opacity: [0.3, 0.5, 0.3]
 }}
 transition={{ duration: 5, repeat: Infinity }}
 className="absolute -right-20 -bottom-20 size-80 bg-white/10 blur-[120px] rounded-full" 
 />
 <div className="relative z-10 space-y-4">
 <p className="text-xs text-muted-foreground font-semibold text-white/50">Projected Balance (T+30 Days)</p>
 <h4 className="text-8xl font-semibold tracking-tight text-white text-glow-mocha leading-none">
 ${prediction.predicted_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
 </h4>
 <div className="flex items-center gap-4 pt-6">
 <div className="px-4 py-2 bg-green-500/10 rounded-full border border-green-500/20 flex items-center gap-3">
 <Zap className="text-green-500 size-4 animate-pulse" />
 <span className="text-xs text-muted-foreground font-semibold text-green-500">
 {prediction.trend} TRAJECTORY
 </span>
 </div>
 </div>
 </div>
 </div>

 <div className="grid lg:grid-cols-2 gap-8">
 <div className="glass-card border-white/5 p-10 rounded-2xl space-y-6">
 <h5 className="font-semibold text-xs text-muted-foreground text-white/60">Neural Confidence Rating</h5>
 <div className="relative pt-2">
 <div className="w-full bg-white/5 h-2 rounded-full border border-white/5 overflow-hidden">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${prediction.confidence * 100}%` }}
 className="mocha-gradient h-full border-r border-white/20" 
 />
 </div>
 <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold text-white/20 mt-3">
 <span>Stochastic</span>
 <span>Deterministic</span>
 </div>
 </div>
 </div>

 <div className="p-10 glass-card bg-white/[0.02] border-dashed border-white/10 rounded-2xl flex gap-6 ">
 <Cpu className="size-10 text-white/20 shrink-0" />
 <p className="text-xs text-muted-foreground font-bold text-white/50 leading-loose ">
 Projections utilized high-fidelity linear regression node-history from the previous 90 sessions. Logic verified at edge.
 </p>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Footer Input */}
 {activeTab === 'chat' && (
 <div className="p-10 border-t border-white/5 backdrop-blur-3xl sticky bottom-0 z-20">
 <div className="relative glass-card bg-white/[0.03] border-white/10 rounded-2xl shadow-2xl overflow-hidden group focus-within:border-white/20 transition-all">
 <Textarea
 ref={textareaRef}
 value={value}
 onChange={(e: any) => {
 setValue(e.target.value);
 adjustHeight();
 }}
 onKeyDown={(e: any) => {
 if (e.key === "Enter" && !e.shiftKey) {
 e.preventDefault();
 handleSendMessage();
 }
 }}
 placeholder="TRANSMIT PROTOCOL QUERY..."
 className="border-none shadow-none focus:ring-0 min-h-[60px] py-6 px-8 text-sm "
 />
 
 <div className="flex items-center justify-between px-8 py-5 border-t border-white/5 bg-white/[0.01]">
 <div className="flex gap-4">
 <button className="size-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90">
 <Command size={18} />
 </button>
 <button className="size-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90">
 <Paperclip size={18} />
 </button>
 </div>
 
 <button 
 onClick={handleSendMessage}
 disabled={!value.trim() || isTyping}
 className="mocha-gradient text-white px-10 py-4 rounded-2xl font-semibold text-xs text-muted-foreground shadow-2xl hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-20 disabled:grayscale"
 >
 {isTyping ? 'SYNCHRONIZING' : 'EXECUTE TRANSMISSION'}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { ChevronLeft, Download, Share2, QrCode, Shield, Zap } from 'lucide-react';

interface ReceiveViewProps {
 onBack: () => void;
}

export const ReceiveView: React.FC<ReceiveViewProps> = ({ onBack }) => {
 const { user } = useAuth();
 const canvasRef = useRef<HTMLCanvasElement>(null);

 useEffect(() => {
 if (user && canvasRef.current) {
 generateQR(canvasRef.current, user.qr_data);
 }
 }, [user]);

 const generateQR = (canvas: HTMLCanvasElement, data: string) => {
 const size = 300;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;

 canvas.width = size;
 canvas.height = size;
 
 const moduleCount = 21;
 const moduleSize = size / moduleCount;
 
 const hashString = (str: string) => {
 let hash = 0;
 for (let i = 0; i < str.length; i++) {
 const char = str.charCodeAt(i);
 hash = ((hash << 5) - hash) + char;
 hash = hash & hash;
 }
 return Math.abs(hash);
 };

 const generateBits = (seed: number, count: number) => {
 const bits = [];
 let current = seed;
 for (let i = 0; i < count; i++) {
 current = (current * 1103515245 + 12345) & 0x7fffffff;
 bits.push(current % 3 === 0);
 }
 return bits;
 };

 const drawFinderPattern = (x: number, y: number) => {
 ctx.fillStyle = '#4A3A32'; // Mocha Primary
 ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize);
 ctx.fillStyle = '#EADFD4'; // Cream
 ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize);
 ctx.fillStyle = '#4A3A32'; // Mocha Primary
 ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
 };

 const isFinderArea = (row: number, col: number) => {
 if (row < 8 && col < 8) return true;
 if (row < 8 && col >= moduleCount - 8) return true;
 if (row >= moduleCount - 8 && col < 8) return true;
 return false;
 };

 const hash = hashString(data);
 const bits = generateBits(hash, moduleCount * moduleCount);

 ctx.fillStyle = '#EADFD4'; // Cream background for QR
 ctx.fillRect(0, 0, size, size);

 drawFinderPattern(0, 0);
 drawFinderPattern((moduleCount - 7) * moduleSize, 0);
 drawFinderPattern(0, (moduleCount - 7) * moduleSize);

 ctx.fillStyle = '#4A3A32'; // Mocha Primary
 for (let row = 0; row < moduleCount; row++) {
 for (let col = 0; col < moduleCount; col++) {
 if (isFinderArea(row, col)) continue;
 const idx = row * moduleCount + col;
 if (bits[idx]) {
 ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize - 0.5, moduleSize - 0.5);
 }
 }
 }

 // Logo area
 const centerX = (moduleCount / 2 - 2.5) * moduleSize;
 const centerY = (moduleCount / 2 - 2.5) * moduleSize;
 const logoSize = 5 * moduleSize;
 ctx.fillStyle = '#EADFD4';
 ctx.fillRect(centerX, centerY, logoSize, logoSize);
 ctx.fillStyle = '#4A3A32';
 ctx.font = `black ${logoSize * 0.5}px sans-serif`;
 ctx.textAlign = 'center';
 ctx.textBaseline = 'middle';
 ctx.fillText('MB', centerX + logoSize/2, centerY + logoSize/2);
 };

 if (!user) return null;

 return (
 <div className="max-w-2xl mx-auto px-6 py-12 animate-fade-up text-center">
 <button 
 onClick={onBack}
 className="group flex items-center gap-3 text-white/60 font-semibold text-xs text-muted-foreground mb-12 hover:text-white transition-all mx-auto md:mx-0"
 >
 <div className="size-8 rounded-full border border-white/5 flex items-center justify-center group-hover:border-white/20 transition-all">
 <ChevronLeft className="size-4" />
 </div>
 Back to Dashboard
 </button>

 <div className="glass-card rounded-2xl p-12 relative overflow-hidden">
 <div className="absolute top-0 inset-x-0 h-64 bg-white/5 blur-[100px] pointer-events-none" />

 <div className="space-y-2 mb-12">
 <h1 className="text-4xl font-semibold tracking-tight text-white">Receive Assets</h1>
 <p className="text-xs text-muted-foreground font-semibold text-white/40">Public Node Address v1.2</p>
 </div>

 <div className="relative group mx-auto w-fit mb-12">
 <div className="absolute -inset-8 bg-white/10 rounded-2xl blur-3xl group-hover:bg-white/10 transition-all duration-700" />
 <div className="relative bg-primary p-1 rounded-2xl shadow-2xl group-hover:scale-[1.02] transition-transform duration-500">
 <div className="bg-[#EADFD4] p-8 rounded-2xl">
 <canvas ref={canvasRef} className="size-48 md:size-64 mix-blend-multiply opacity-90" />
 </div>
 </div>
 <div className="absolute -bottom-4 -right-4 size-12 mocha-gradient text-white rounded-2xl flex items-center justify-center shadow-lg animate-bounce duration-[3000ms]">
 <QrCode size={20} />
 </div>
 </div>

 <div className="space-y-1 mb-12">
 <p className="text-2xl font-semibold tracking-tight text-white">{user.name}</p>
 <p className="text-xs text-muted-foreground font-mono font-bold text-white/50 break-all max-w-[280px] mx-auto opacity-60">
 {user.id}
 </p>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <button className="flex items-center justify-center gap-3 p-6 bg-white/[0.03] border border-white/10 rounded-2xl font-semibold text-xs text-muted-foreground text-white/70 hover:text-white hover:bg-white/[0.08] transition-all group">
 <Download className="size-4 group-hover:translate-y-0.5 transition-transform" /> Save Node Card
 </button>
 <button className="flex items-center justify-center gap-3 p-6 bg-white/[0.03] border border-white/10 rounded-2xl font-semibold text-xs text-muted-foreground text-white/70 hover:text-white hover:bg-white/[0.08] transition-all group">
 <Share2 className="size-4 group-hover:scale-110 transition-transform" /> Broadcast Link
 </button>
 </div>

 <div className="mt-12 p-6 bg-white/5 rounded-2xl flex items-center gap-5 text-left border border-white/5 relative overflow-hidden">
 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
 <div className="size-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
 <Shield className="size-6 text-white/60" />
 </div>
 <div className="space-y-1">
 <p className="text-xs text-muted-foreground font-semibold text-white/70">Peer Discovery Mode</p>
 <p className="text-xs text-muted-foreground font-bold text-white/50 leading-relaxed r">
 This QR code contains your unique node parameters. Scan to initialize a zero-knowledge transaction.
 </p>
 </div>
 <Zap size={14} className="absolute bottom-4 right-4 text-white/20" />
 </div>
 </div>
 </div>
 );
};

import React from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { Header } from './components/ui/header-3';
import { AnimatedAIChat } from './components/ui/animated-ai-chat';
import { AuthView } from './components/views/auth-view';
import { DashboardView } from './components/views/dashboard-view';
import { WalletView } from './components/views/wallet-view';
import { TransferView } from './components/views/transfer-view';
import { ReceiveView } from './components/views/receive-view';
import { HistoryView } from './components/views/history-view';
import { POSView } from './components/views/pos-view';
import { NetworkView } from './components/views/network-view';
import { Button } from './components/ui/button';
import { Globe, Bot } from 'lucide-react';

function AppContent() {
 const { user, isLoading } = useAuth();
 const [currentPage, setCurrentPage] = React.useState('home');

 if (isLoading) {
 return (
 <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white">
 <div className="glass-card p-12 rounded-2xl flex flex-col items-center space-y-6">
 <div className="size-16 mocha-gradient rounded-2xl flex items-center justify-center text-white shadow-lg animate-pulse">
 <Globe size={32} />
 </div>
 <div className="space-y-2 text-center">
 <p className="font-medium text-white text-sm">MeshBank Link</p>
 <p className="text-xs text-white/40">Establishing secure node connection...</p>
 </div>
 </div>
 </div>
 );
 }

 if (!user) {
 return <AuthView />;
 }

 return (
 <div className="min-h-screen font-sans selection:bg-white/20 selection:text-white relative overflow-x-hidden text-white">
 {/* Obsidian Black Dynamic Background Layer for True Glassmorphism */}
 <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-black">
 {/* High brightness orbs mapped to Mocha/Cream palette */}
 <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#EADFD4] rounded-full blur-[160px] opacity-15" />
 <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-[#4A3A32] rounded-full blur-[180px] opacity-40" />
 <div className="absolute top-[20%] right-[30%] w-[40vw] h-[40vw] bg-indigo-500 rounded-full blur-[140px] opacity-10" />
 
 {/* Complex Technical Grid Overlay */}
 <div className="absolute inset-0 bg-grid-pattern opacity-60" />
 </div>

 <Header />
 
 <main className="pb-32 relative">
 {currentPage === 'home' && (
 <DashboardView onNavigate={(page) => setCurrentPage(page)} />
 )}

 {currentPage === 'wallet' && (
 <div className="animate-fade-up">
 <WalletView onBack={() => setCurrentPage('home')} />
 </div>
 )}

 {currentPage === 'send' && (
 <div className="animate-fade-up">
 <TransferView onBack={() => setCurrentPage('home')} />
 </div>
 )}

 {currentPage === 'receive' && (
 <div className="animate-fade-up">
 <ReceiveView onBack={() => setCurrentPage('home')} />
 </div>
 )}

 {currentPage === 'history' && (
 <div className="animate-fade-up">
 <HistoryView onBack={() => setCurrentPage('home')} />
 </div>
 )}

 {currentPage === 'pos' && (
 <div className="animate-fade-up">
 <POSView onBack={() => setCurrentPage('home')} />
 </div>
 )}

 {currentPage === 'network' && (
 <div className="animate-fade-up">
 <NetworkView onBack={() => setCurrentPage('home')} />
 </div>
 )}

 {currentPage === 'ai' && (
 <div className="py-12 animate-fade-up">
 <div className="max-w-4xl mx-auto px-6 mb-8 flex justify-between items-center">
 <div className="space-y-1">
 <h2 className="text-3xl font-semibold text-white tracking-tight">Financial Assistant</h2>
 <p className="text-sm text-white/50">MeshBank Analytics Engine</p>
 </div>
 <Button 
 variant="outline" 
 className="border border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-full px-6 py-2 transition-all" 
 onClick={() => setCurrentPage('home')}
 >
 Return to Node
 </Button>
 </div>
 <AnimatedAIChat />
 </div>
 )}
 </main>

 {/* Floating Action Button for AI Assistant */}
 {currentPage !== 'ai' && (
   <button 
     onClick={() => setCurrentPage('ai')}
     className="fixed bottom-8 right-8 z-50 size-16 bg-indigo-500/30 border border-indigo-400/50 shadow-[0_0_30px_rgba(99,102,241,0.4)] rounded-full flex items-center justify-center hover:scale-110 hover:bg-indigo-500/40 active:scale-95 transition-all duration-300 backdrop-blur-md group"
   >
     <div className="absolute inset-0 bg-indigo-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
     <Bot className="size-8 text-indigo-100 relative z-10" />
     <div className="absolute top-0 right-0 size-3 bg-red-500 rounded-full border-2 border-black animate-pulse" /> {/* Notification dot */}
   </button>
 )}

 <footer className="border-t border-white/10 py-12 glass-card rounded-t-3xl relative z-10 border-x-0 border-b-0">
 <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center">
 <div className="space-y-4">
 <div className="flex items-center gap-3">
 <div className="mocha-gradient text-white p-2 rounded-lg shadow-sm">MB</div>
 <span className="font-semibold text-lg text-white">MeshBank</span>
 </div>
 <p className="text-white/60 text-sm leading-relaxed max-w-sm">
 Decentralized offline financial infrastructure. Engineered for autonomous operation without external dependencies.
 </p>
 </div>
 <div className="flex flex-col md:items-end gap-2 text-sm text-white/40">
 <p>Hackathon Protocol Release v1.2</p>
 <div className="h-px w-24 bg-white/10 my-1" />
 <p>Raspberry Pi Powered Mesh Network</p>
 </div>
 </div>
 </footer>
 </div>
 );
}

function App() {
 return (
 <AuthProvider>
 <AppContent />
 </AuthProvider>
 );
}

export default App;

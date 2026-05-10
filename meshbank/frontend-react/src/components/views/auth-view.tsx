import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Globe, ShieldCheck, UserPlus, LogIn, Phone, Lock, User } from 'lucide-react';

export const AuthView: React.FC = () => {
 const { login, register } = useAuth();
 const [isRegistering, setIsRegistering] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Form states
 const [name, setName] = useState('');
 const [phone, setPhone] = useState('');
 const [pin, setPin] = useState('');
 const [isVendor, setIsVendor] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsLoading(true);
 setError(null);

 let result;
 if (isRegistering) {
 result = await register(name, phone, pin, isVendor);
 } else {
 result = await login(phone, pin);
 }

 if (!result.success) {
 setError(result.message);
 setIsLoading(false);
 }
 };

 const handleDemoLogin = async (demoPhone: string, demoPin: string) => {
 setIsLoading(true);
 setError(null);
 const result = await login(demoPhone, demoPin);
 if (!result.success) {
 setError(result.message);
 setIsLoading(false);
 }
 };

 return (
 <div className="min-h-[90vh] flex items-center justify-center p-6 animate-fade-up">
 <div className="w-full max-w-[440px] glass-card p-10 rounded-2xl relative overflow-hidden group">
 {/* Decorative corner glow */}
 <div className="absolute -top-24 -right-24 size-48 bg-white/5 blur-[80px] rounded-full group-hover:bg-white/10 transition-colors duration-700" />
 
 <div className="flex flex-col items-center mb-10 relative">
 <div className="size-16 mocha-gradient text-white flex items-center justify-center rounded-2xl shadow-lg mb-6">
 <Globe size={32} strokeWidth={1.5} />
 </div>
 <h1 className="text-4xl font-semibold tracking-tight text-white ">MeshBank</h1>
 <div className="h-0.5 w-12 bg-white/10 mt-4 rounded-full" />
 <p className="font-bold text-white/60 text-xs text-muted-foreground mt-6">
 {isRegistering ? 'Initialize Offline Node' : 'Secure Protocol Access'}
 </p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-5 relative">
 {isRegistering && (
 <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
 <label className="text-xs text-muted-foreground font-semibold text-white/50 ml-1 flex items-center gap-2">
 <User size={12} /> Full Name
 </label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-primary/40 focus:bg-white/10 outline-none transition-all placeholder:text-white/20 text-sm"
 placeholder="Identity Name"
 required
 />
 </div>
 )}

 <div className="space-y-1.5">
 <label className="text-xs text-muted-foreground font-semibold text-white/50 ml-1 flex items-center gap-2">
 <Phone size={12} /> Phone Identifier
 </label>
 <input
 type="tel"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-primary/40 focus:bg-white/10 outline-none transition-all placeholder:text-white/20 text-sm"
 placeholder="e.g. 555-1001"
 required
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs text-muted-foreground font-semibold text-white/50 ml-1 flex items-center gap-2">
 <Lock size={12} /> Secure PIN
 </label>
 <input
 type="password"
 value={pin}
 onChange={(e) => setPin(e.target.value)}
 maxLength={6}
 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-primary/40 focus:bg-white/10 outline-none transition-all placeholder:text-white/20 text-sm "
 placeholder="••••"
 required
 />
 </div>

 {isRegistering && (
 <div className="flex items-center gap-3 py-3 animate-in fade-in slide-in-from-top-2 duration-400">
 <button
 type="button"
 onClick={() => setIsVendor(!isVendor)}
 className={`size-6 rounded-lg border border-white/10 border-white/20 transition-all flex items-center justify-center ${isVendor ? 'bg-primary border-primary' : 'bg-white/5'}`}
 >
 {isVendor && <ShieldCheck size={14} className="text-secondary" strokeWidth={3} />}
 </button>
 <span className="font-bold text-xs text-white/70 ">Register as Vendor Node</span>
 </div>
 )}

 {error && (
 <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-2xl text-xs text-muted-foreground font-semibold text-center animate-in zoom-in duration-200">
 Error: {error}
 </div>
 )}

 <Button 
 type="submit" 
 disabled={isLoading} 
 className="w-full py-8 text-sm font-semibold rounded-2xl shadow-2xl hover:shadow-glow-cream hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
 >
 {isLoading ? (
 <span className="flex items-center gap-2">
 <div className="size-4 border border-white/10 border-secondary/30 border-t-secondary animate-spin rounded-full" />
 Encrypting...
 </span>
 ) : (
 <span className="flex items-center gap-2">
 {isRegistering ? <UserPlus size={18} /> : <LogIn size={18} />}
 {isRegistering ? 'Genesis Account' : 'Authenticate'}
 </span>
 )}
 </Button>

 <p className="text-center font-bold text-xs text-muted-foreground text-white/50 pt-4 leading-loose">
 {isRegistering ? 'Already in the network?' : "New to MeshBank?"}{' '}
 <button
 type="button"
 onClick={() => setIsRegistering(!isRegistering)}
 className="text-white hover:text-white transition-colors underline underline-offset-4 decoration-primary/20"
 >
 {isRegistering ? 'Sign In' : 'Join Node'}
 </button>
 </p>
 </form>

 {!isRegistering && (
 <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center">
 <p className="text-xs text-muted-foreground font-semibold text-white/40 mb-6 ">Secure Demo Entry</p>
 <div className="grid grid-cols-2 gap-4 w-full">
 {[
 { name: 'Alice', phone: '5551001', pin: '1234', icon: '👩', role: 'User' },
 { name: 'Charlie', phone: '5551003', pin: '9999', icon: '☕', role: 'Vendor' }
 ].map((demo) => (
 <button
 key={demo.phone}
 onClick={() => handleDemoLogin(demo.phone, demo.pin)}
 className="group relative flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all duration-300"
 >
 <span className="text-xl mb-2 group-hover:scale-125 transition-transform duration-500">{demo.icon}</span>
 <p className="font-semibold text-xs text-muted-foreground tracking-tight text-white/70">{demo.name}</p>
 <p className="text-xs text-muted-foreground font-bold text-white/40 mt-1">{demo.role}</p>
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 );
};

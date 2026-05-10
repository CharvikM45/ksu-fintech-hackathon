'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { createPortal } from 'react-dom';
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { useAuth } from '@/lib/auth';
import {
	Globe,
	Layers,
	UserPlus,
	Users,
	Star,
	Shield,
	BarChart,
	LogOut,
	User,
	Cpu,
	Activity,
	Zap,
	ChevronDown
} from 'lucide-react';

type LinkItem = {
	title: string;
	href: string;
	icon: any;
	description?: string;
};

export function Header() {
	const { user, logout } = useAuth();
	const [open, setOpen] = React.useState(false);
	const scrolled = useScroll(10);

	React.useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	return (
		<header
			className={cn('sticky top-0 z-[100] w-full transition-all duration-500 border-b border-white/0', {
				'bg-[#1a1715]/80 backdrop-blur-xl border-white/5 shadow-2xl py-2':
					scrolled,
			})}
		>
			<nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-8">
				<div className="flex items-center gap-12">
					<a href="/" className="flex items-center gap-3 group">
						<div className="mocha-gradient text-white p-2 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-500">
 <Globe size={22} strokeWidth={2} />
 </div>
 <div className="flex flex-col">
 <span className="font-semibold text-2xl tracking-tight text-white leading-none">MeshBank</span>
 <span className="text-xs text-muted-foreground font-bold text-white/50 mt-1">Decentralized Node</span>
 </div>
					</a>
					<NavigationMenu className="hidden lg:flex">
						<NavigationMenuList className="gap-4">
							<NavigationMenuItem>
								<NavigationMenuTrigger className="bg-transparent hover:text-white transition-colors text-xs font-semibold text-white/70 flex items-center gap-2">
 Protocol <ChevronDown size={12} className="opacity-40" />
 </NavigationMenuTrigger>
								<NavigationMenuContent>
									<ul className="grid w-[500px] grid-cols-2 gap-2 p-6 glass-card rounded-2xl border-white/10">
										{productLinks.map((item, i) => (
											<li key={i}>
												<ListItem {...item} />
											</li>
										))}
									</ul>
								</NavigationMenuContent>
							</NavigationMenuItem>
							<NavigationMenuItem>
								<NavigationMenuTrigger className="bg-transparent hover:text-white transition-colors text-xs font-semibold text-white/70 flex items-center gap-2">
 Network <ChevronDown size={12} className="opacity-40" />
 </NavigationMenuTrigger>
								<NavigationMenuContent>
									<div className="grid w-[500px] grid-cols-2 gap-2 p-6 glass-card rounded-2xl border-white/10">
										<ul className="space-y-2">
											{companyLinks.map((item, i) => (
												<li key={i}>
													<ListItem {...item} />
												</li>
											))}
										</ul>
										<ul className="space-y-1 py-1 px-4 border-l border-white/5">
											{companyLinks2.map((item, i) => (
												<li key={i}>
													<NavigationMenuLink
														href={item.href}
														className="flex p-3 hover:bg-white/5 rounded-xl items-center gap-x-3 text-xs text-muted-foreground font-semibold text-white/60 hover:text-white transition-all group"
													>
														<item.icon className="text-white/40 group-hover:text-white size-4 transition-colors" />
														<span>{item.title}</span>
													</NavigationMenuLink>
												</li>
											))}
										</ul>
									</div>
								</NavigationMenuContent>
							</NavigationMenuItem>
						</NavigationMenuList>
					</NavigationMenu>
				</div>

				<div className="hidden items-center gap-6 md:flex">
					{user ? (
						<div className="flex items-center gap-4">
 <div className="flex flex-col items-end">
 <span className="text-xs text-muted-foreground font-semibold text-white/50">Local Node</span>
 <span className="text-xs text-muted-foreground font-semibold text-white">{user.name}</span>
 </div>
							<div className="size-10 mocha-gradient rounded-full border border-white/10 p-0.5 shadow-2xl">
 <div className="size-full bg-[#1a1715] rounded-full flex items-center justify-center text-white font-semibold text-xs ">
 {user.name[0]}
 </div>
							</div>
							<Button 
								variant="ghost" 
								size="icon"
								onClick={logout}
								className="text-white/40 hover:text-destructive hover:bg-destructive/5 transition-all"
							>
								<LogOut size={18} />
							</Button>
						</div>
					) : (
						<div className="flex items-center gap-4">
							<Button variant="ghost" className="text-xs font-semibold text-white/70 hover:text-white">Sign In</Button>
							<Button className="bg-primary text-secondary text-xs font-semibold px-8 rounded-full shadow-2xl hover:shadow-glow-cream transition-all">Join Network</Button>
						</div>
					)}
				</div>

				<Button
					size="icon"
					variant="outline"
					onClick={() => setOpen(!open)}
					className="md:hidden border-white/10 bg-white/5 hover:bg-white/10 rounded-xl"
					aria-expanded={open}
				>
					<MenuToggleIcon open={open} className="size-6 text-white" duration={300} />
				</Button>
			</nav>

			<MobileMenu open={open} className="flex flex-col justify-between gap-8 overflow-y-auto">
				<div className="flex w-full flex-col gap-y-8">
 {user && (
 <div className="p-6 glass-card rounded-2xl flex items-center justify-between group">
 <div className="flex items-center gap-4">
 <div className="mocha-gradient text-white size-12 rounded-xl flex items-center justify-center shadow-lg">
 <User size={24} />
 </div>
 <div className="flex flex-col">
 <span className="font-semibold text-base tracking-tight text-white">{user.name}</span>
 <div className="flex items-center gap-2 mt-1">
 <div className="size-1 bg-green-500 rounded-full animate-pulse" />
 <span className="text-xs text-muted-foreground font-semibold text-white/50 ">Active Peer</span>
 </div>
 </div>
 </div>
 <Button variant="ghost" size="icon" onClick={logout} className="text-destructive/40 hover:text-destructive">
 <LogOut size={22} />
 </Button>
 </div>
 )}
 
 <div className="space-y-6">
					 <span className="text-xs text-muted-foreground font-semibold text-white/40 ml-2">Protocol Directives</span>
 <div className="grid gap-3">
						 {productLinks.map((link) => (
							 <ListItem key={link.title} {...link} />
						 ))}
 </div>
 </div>
				</div>
				{!user && (
					<div className="flex flex-col gap-4 pb-12">
						<Button variant="outline" className="w-full bg-white/5 border-white/10 py-8 rounded-2xl font-semibold text-xs">Access Terminal</Button>
						<Button className="w-full bg-primary text-secondary py-8 rounded-2xl font-semibold text-xs shadow-2xl">Initialize Identity</Button>
					</div>
				)}
			</MobileMenu>
		</header>
	);
}

function MobileMenu({ open, children, className, ...props }: any) {
	if (!open || typeof window === 'undefined') return null;

	return createPortal(
		<div
			id="mobile-menu"
			className="bg-[#0e0c0b]/95 backdrop-blur-2xl fixed top-20 right-0 bottom-0 left-0 z-[100] flex flex-col overflow-hidden md:hidden border-t border-white/5"
		>
			<div className={cn('size-full p-8 animate-fade-up', className)} {...props}>
				{children}
			</div>
		</div>,
		document.body,
	);
}

function ListItem({ title, description, icon: Icon, className, href }: LinkItem & { className?: string }) {
	return (
		<NavigationMenuLink asChild>
			<a href={href} className={cn("flex flex-row gap-4 items-center p-4 rounded-2xl bg-white/0 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-300 group", className)}>
				<div className="bg-white/5 flex aspect-square size-12 items-center justify-center rounded-xl border border-white/5 group-hover:mocha-gradient group-hover:text-white transition-all duration-500 shadow-2xl">
					<Icon className="text-white/60 group-hover:text-white size-5 transition-colors" />
				</div>
				<div className="flex flex-col">
					<span className="font-semibold text-xs text-muted-foreground r text-white group-hover:text-white transition-colors">{title}</span>
					{description && <span className="text-white/40 text-xs text-muted-foreground font-bold mt-0.5 group-hover:text-white/60 transition-colors line-clamp-1">{description}</span>}
				</div>
			</a>
		</NavigationMenuLink>
	);
}

const productLinks: LinkItem[] = [
	{ title: 'Offline Banking', href: '#', description: 'Zero-latency local ledger', icon: Cpu },
	{ title: 'POS Terminal', href: '#', description: 'Autonomous merchant node', icon: Layers },
	{ title: 'P2P Protocol', href: '#', description: 'Direct cryptographic exchange', icon: UserPlus },
	{ title: 'Neural Insights', href: '#', description: 'Deep learning wealth analysis', icon: BarChart },
];

const companyLinks: LinkItem[] = [
	{ title: 'Our Manifesto', href: '#', description: 'Privacy-first financial autonomy', icon: Shield },
	{ title: 'Network Status', href: '#', description: 'Global node health monitoring', icon: Activity },
];

const companyLinks2: LinkItem[] = [
	{ title: 'Core Security', href: '#', icon: Shield },
	{ title: 'Protocol Specs', href: '#', icon: Zap },
];

function useScroll(threshold: number) {
	const [scrolled, setScrolled] = React.useState(false);
	React.useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > threshold);
		window.addEventListener('scroll', onScroll);
		onScroll();
		return () => window.removeEventListener('scroll', onScroll);
	}, [threshold]);
	return scrolled;
}

"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

function FloatingPaths({ position }: { position: number }) {
 const paths = Array.from({ length: 36 }, (_, i) => ({
 id: i,
 d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
 380 - i * 5 * position
 } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
 152 - i * 5 * position
 } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
 684 - i * 5 * position
 } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
 color: `rgba(74,58,50,${0.05 + i * 0.01})`,
 width: 0.5 + i * 0.03,
 }));

 return (
 <div className="absolute inset-0 pointer-events-none overflow-hidden">
 <svg
 className="w-full h-full text-white"
 viewBox="0 0 696 316"
 fill="none"
 preserveAspectRatio="none"
 >
 <title>Background Paths</title>
 {paths.map((path) => (
 <motion.path
 key={path.id}
 d={path.d}
 stroke="currentColor"
 strokeWidth={path.width}
 strokeOpacity={0.05 + path.id * 0.01}
 initial={{ pathLength: 0.3, opacity: 0.2 }}
 animate={{
 pathLength: 1,
 opacity: [0.1, 0.3, 0.1],
 pathOffset: [0, 1, 0],
 }}
 transition={{
 duration: 25 + Math.random() * 15,
 repeat: Number.POSITIVE_INFINITY,
 ease: "linear",
 }}
 />
 ))}
 </svg>
 </div>
 );
}

export function BackgroundPaths({
 title = "Bank Without Limits",
}: {
 title?: string;
}) {
 const words = title.split(" ");

 return (
 <div className="relative h-[600px] w-full flex items-center justify-center overflow-hidden bg-secondary/30 border-b border-white/10 border-primary">
 <div className="absolute inset-0">
 <FloatingPaths position={1} />
 <FloatingPaths position={-1} />
 </div>

 <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ duration: 1.5 }}
 className="max-w-4xl mx-auto"
 >
 <h1 className="text-6xl sm:text-8xl md:text-9xl font-semibold mb-8 tracking-tight ">
 {words.map((word, wordIndex) => (
 <span
 key={wordIndex}
 className="inline-block mr-4 last:mr-0"
 >
 {word.split("").map((letter, letterIndex) => (
 <motion.span
 key={`${wordIndex}-${letterIndex}`}
 initial={{ y: 80, opacity: 0, rotate: wordIndex % 2 === 0 ? -10 : 10 }}
 animate={{ y: 0, opacity: 1, rotate: 0 }}
 transition={{
 delay: wordIndex * 0.1 + letterIndex * 0.03,
 type: "spring",
 stiffness: 150,
 damping: 20,
 }}
 className="inline-block text-white drop-shadow-xl"
 >
 {letter}
 </motion.span>
 ))}
 </span>
 ))}
 </h1>

 <div className="pt-4">
 <Button
 size="lg"
 className="text-xl px-12 py-8 rounded-xl font-semibold "
 >
 <span className="relative z-10">Start Banking Offline</span>
 <span className="ml-3 group-hover:translate-x-2 transition-transform">→</span>
 </Button>
 </div>
 </motion.div>
 </div>
 
 {/* Texture Overlay */}
 <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay">
 <svg viewBox="0 0 100 100" className="w-full h-full">
 <filter id="noise">
 <feTurbulence type="fractalNoise" baseFrequency="0.65" />
 </filter>
 <rect width="100" height="100" filter="url(#noise)" />
 </svg>
 </div>
 </div>
 );
}

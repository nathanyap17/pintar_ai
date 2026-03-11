"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import AuthGuard from "@/components/AuthGuard";
import { useState } from "react";
import { Box, Search, Menu, X, Clock } from "lucide-react";
import { GlitchText } from "./GlitchText";

const NAV_ITEMS = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/shadow-ledger", label: "Shadow Ledger" },
    { href: "/snap-sell", label: "VernStudio" },
    { href: "/customs", label: "Sentinel" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user } = useUser();
    const [mobileOpen, setMobileOpen] = useState(false);

    const linkClass = (href: string) =>
        `text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-300 ${pathname === href
            ? "text-primary border-b-2 border-primary pb-1 shadow-[0_4px_10px_rgba(0,255,136,0.3)]"
            : "text-gray-400 hover:text-white"
        }`;

    const mobileLinkClass = (href: string) =>
        `block text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-300 py-3 border-b border-border/50 ${pathname === href
            ? "text-primary shadow-[0_4px_10px_rgba(0,255,136,0.3)]"
            : "text-gray-400 hover:text-white"
        }`;

    return (
        <AuthGuard>
            <div className="relative flex min-h-screen w-full flex-col bg-background overflow-x-hidden text-foreground font-display selection:bg-primary/30">
                {/* ═══ Top Header (matching prototype Header.tsx) ═══ */}
                <header className="sticky top-0 z-50 flex flex-col h-16 border-b border-white/10 bg-[#0a0a0c] overflow-hidden">
                    {/* Cyberpunk top border accent */}
                    <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-primary to-transparent opacity-50"></div>

                    <div className="flex items-center justify-between px-6 h-full w-full">
                        <div className="flex items-center gap-10 relative z-10">
                            <Link href="/dashboard" className="flex items-center gap-3 group cursor-pointer">
                                <div className="flex h-10 w-10 items-center justify-center bg-primary/10 border border-primary shadow-[0_0_15px_rgba(0,255,136,0.2)] group-hover:bg-primary/20 transition-all cyber-chamfer-sm">
                                    <Box className="text-primary h-5 w-5" />
                                </div>
                                <GlitchText
                                    text="PINTAR.ai"
                                    className="text-xl font-bold text-white tracking-tighter"
                                >
                                    PINTAR<span className="text-primary">.ai</span>
                                </GlitchText>
                            </Link>

                            <nav className="hidden items-center gap-6 xl:flex ml-8">
                                {NAV_ITEMS.map((item) => (
                                    <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                        </div>

                        <div className="flex items-center gap-6 relative z-10">
                            <div className="relative hidden sm:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary h-4 w-4" />
                                <input
                                    className="cyber-input h-10 w-64 pl-10 pr-4 text-xs placeholder:text-muted-foreground"
                                    placeholder="> SYSTEM_SEARCH..."
                                    type="text"
                                />
                            </div>
                            <div style={{
                                background: "rgba(255,255,255,0.08)",
                                borderRadius: 6,
                                padding: 3,
                                border: "1px solid rgba(255,255,255,0.1)",
                            }}>
                                <UserButton
                                    appearance={{
                                        elements: {
                                            avatarBox: { width: 34, height: 34 },
                                            userButtonPopoverCard: {
                                                background: "#12121a",
                                                border: "1px solid rgba(0,255,136,0.2)",
                                                color: "#e0e0e0",
                                            },
                                            userButtonPopoverActionButton: { color: "#e0e0e0" },
                                            userButtonPopoverActionButtonText: { color: "#e0e0e0" },
                                            userButtonPopoverFooter: { display: "none" },
                                        },
                                    }}
                                />
                            </div>
                            <button
                                className="xl:hidden text-primary p-2 hover:bg-primary/10 transition-colors cyber-chamfer-sm"
                                onClick={() => setMobileOpen(!mobileOpen)}
                            >
                                {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    {mobileOpen && (
                        <div className="xl:hidden w-full bg-background/95 border-t border-border/50 px-6 py-4 flex flex-col gap-2">
                            <nav className="flex flex-col">
                                {NAV_ITEMS.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={mobileLinkClass(item.href)}
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    )}
                </header>

                {/* ═══ Main Content ═══ */}
                <div className="pt-12" style={{ position: "relative", zIndex: 10, flex: 1 }}>
                    {children}
                </div>

                {/* ═══ Footer (matching Sentinel template) ═══ */}
                <footer className="mt-auto h-8 border-t border-white/10 px-6 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, #0a0a0c 0%, #111114 50%, #0a0a0c 100%)' }}>
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,255,136,1)]"></div>
                            <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Network Secure</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                            <Clock className="text-gray-500 h-3 w-3" />
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Latency: 24ms</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-[9px] font-bold text-gray-500">
                        <span className="uppercase">v2.4.0-sentinel</span>
                        <span className="text-primary/60">© 2026 PINTAR TECHNOLOGIES</span>
                    </div>
                </footer>
            </div>
        </AuthGuard>
    );
}

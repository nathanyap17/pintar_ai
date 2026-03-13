import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
    return (
        <div className="landing-page bg-[#050804] text-slate-100 selection:bg-[#39FF14] selection:text-black">
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin 3s linear infinite;
        }
      `}} />
            <div className="fixed inset-0 tech-grid pointer-events-none z-0"></div>
            <div className="relative z-10 min-h-screen flex flex-col">
                <header className="sticky top-0 z-50 w-full border-b border-[#39FF14]/20 glass-panel">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img alt="PINTAR.ai Logo" className="w-10 h-10 object-contain" src="/logo.png" />
                            <h1 className="text-2xl font-bold tracking-tighter text-[#39FF14] brand-font"><span className="text-white uppercase">PINTAR</span>.ai</h1>
                        </div>
                        <nav className="hidden md:flex items-center gap-10">
                            <a className="text-xs font-medium hover:text-[#39FF14] transition-colors uppercase tracking-widest" href="#">feature</a>
                            <a className="text-xs font-medium hover:text-[#39FF14] transition-colors uppercase tracking-widest" href="#">docs</a>
                            <a className="text-xs font-medium hover:text-[#39FF14] transition-colors uppercase tracking-widest" href="#">SDG Goals</a>
                        </nav>
                        <div className="flex items-center gap-4">
                            <button className="px-5 py-2 text-xs font-bold border border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14] hover:text-black transition-all rounded uppercase brand-font"><Link href="/sign-in">Login</Link></button>
                            <button className="px-5 py-2 text-xs font-bold bg-[#39FF14] text-black hover:bg-white transition-all rounded neon-glow uppercase brand-font"><Link href="/sign-up">register</Link></button>
                        </div>
                    </div>
                </header>
                <main className="grow">
                    <section className="relative py-20 lg:py-32 px-6 overflow-hidden">
                        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                            <div className="relative z-10">
                                <div className="inline-block px-3 py-1 mb-6 border border-[#39FF14]/30 bg-[#39FF14]/10 rounded text-[10px] font-bold text-[#39FF14] tracking-[0.2em] uppercase">
                                    Operational status: Active
                                </div>
                                <h1 className="text-5xl lg:text-7xl font-black leading-none mb-8 dark:text-white glitch-text uppercase">
                                    EMPOWERING <span className="text-[#39FF14] italic">MSMEs</span> IN ASEAN WITH <br />INCLUSIVE GROWTH ENGINE
                                </h1>
                                <p className="text-sm text-slate-400 max-w-xl mb-10 leading-relaxed">
                                    Revolutionizing informal trade through the lens of Shadow Ledger and Bankability. We bridge the gap between street markets and global finance.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <button className="px-8 py-4 bg-[#39FF14] text-black font-black rounded-lg text-base flex items-center gap-2 hover:scale-105 transition-transform brand-font">
                                        <span className="material-symbols-outlined">play_circle</span>
                                        <Link href="#">LAUNCH DEMO</Link>
                                    </button>
                                    <button className="px-8 py-4 border border-slate-700 bg-slate-900/50 backdrop-blur text-white font-bold rounded-lg text-base flex items-center gap-2 hover:bg-slate-800 transition-colors brand-font">
                                        <span className="material-symbols-outlined">terminal</span>
                                        <Link href="https://github.com/nathanyap17/pintar_ai" target="_blank">VIEW GITHUB</Link>
                                    </button>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="glass-panel p-6 rounded-xl border-[#39FF14]/40 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-linear-to-br from-[#39FF14]/10 to-transparent"></div>
                                    <div className="flex items-center justify-between mb-6 border-b border-[#39FF14]/20 pb-4">
                                        <div className="flex gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                            <div className="w-3 h-3 rounded-full bg-[#39FF14]/50"></div>
                                        </div>
                                        <span className="text-[10px] text-[#39FF14]/60 uppercase tracking-widest">System Monitor: SHADOW_LEDGER_V2</span>
                                    </div>
                                    <div className="space-y-4 text-xs">
                                        <div className="flex items-center gap-4 text-[#39FF14]">
                                            <span className="opacity-50">01</span>
                                            <span className="">Initializing Pua Kumbu OCR Neural Link...</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-slate-400">
                                            <span className="opacity-50">02</span>
                                            <span className="">Scanning Bario Rice transaction logs... [SUCCESS]</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="opacity-50 text-slate-400">03</span>
                                            <div className="h-2 grow bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#39FF14] w-2/3 shadow-[0_0_10px_#39FF14]"></div>
                                            </div>
                                            <span className="text-[#39FF14]">67%</span>
                                        </div>
                                        <div className="mt-8 p-4 bg-black/50 border border-[#39FF14]/20 rounded">
                                            <div className="text-[10px] text-[#39FF14] mb-2 uppercase font-bold">Proxy Credit Score (300-850)</div>
                                            <div className="text-4xl font-bold text-white tracking-widest brand-font">742.08</div>
                                            <div className="w-full h-1 bg-[#39FF14]/20 mt-2">
                                                <div className="h-full bg-[#39FF14] w-[74%] shadow-[0_0_15px_#39FF14]"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#39FF14]/5 rounded-full blur-3xl"></div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="py-24 px-6 bg-[#0A0F08]/50 relative border-y border-[#39FF14]/10">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                                <div>
                                    <h2 className="text-[10px] font-bold text-[#39FF14] tracking-[0.4em] uppercase mb-4 brand-font">Core Infrastructure</h2>
                                    <h3 className="text-4xl font-bold text-white uppercase">CYBERNETIC FEATURE GRID</h3>
                                </div>
                                <div className="text-slate-500 text-xs max-w-xs">
                        // High-speed data processing units for regional commerce optimization.
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="glass-panel p-8 group hover:border-[#39FF14] transition-all duration-500 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined text-[#39FF14] text-4xl">visibility</span>
                                    </div>
                                    <div className="h-12 w-12 bg-[#39FF14]/20 rounded flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-[#39FF14]">analytics</span>
                                    </div>
                                    <h4 className="text-lg font-bold mb-3 text-white brand-font uppercase">Shadow Ledger</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed mb-6">OCR + AI for informal trade featuring Sarawak's Pua Kumbu motif pattern recognition in receipts.</p>
                                    <div className="w-full h-32 bg-slate-900 rounded overflow-hidden relative border border-[#39FF14]/5">
                                        <div className="absolute inset-0 bg-linear-to-t from-black to-transparent"></div>
                                        <div className="p-3">
                                            <div className="h-1 w-2/3 bg-[#39FF14]/20 mb-2"></div>
                                            <div className="h-1 w-1/2 bg-[#39FF14]/20 mb-2"></div>
                                            <div className="h-1 w-3/4 bg-[#39FF14]/40"></div>
                                        </div>
                                        <img className="w-full h-full object-cover opacity-30 mix-blend-screen" data-alt="Traditional Pua Kumbu textile pattern visualised as data" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbVsgGXQWgNp_A6AC06LzuxX0PalfEdDbq6y0mWXj9Mx8UmDEZ78TBiPHJJoamhqPfxwcUoMpguazy9K2aCUTHBlaHvz3qzoLXxTrVhdNzoI9BMcZZAlsLH8w8sZPTA8t6ABAXVD6EzWeOZp-x_66i3WgEVNUw48uE5gJm8mDtBvqiMtYf3_ZlgaXoud40ioChe5HW0wB3VTa7wbb10eon4zlAn5PTb0ZTQ9nc4kLgAQ8CPPUDeJD3jjfb04wvYtk5oz5bkO9aYOI" />
                                    </div>
                                </div>
                                <div className="glass-panel p-8 group hover:border-[#39FF14] transition-all duration-500">
                                    <div className="h-12 w-12 bg-[#39FF14]/20 rounded flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-[#39FF14]">account_balance_wallet</span>
                                    </div>
                                    <h4 className="text-lg font-bold mb-3 text-white brand-font uppercase">Bankability Dashboard</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed mb-6">Qwen 3 VL Proxy Credit Score (300-850) engine evaluating non-traditional financial vectors.</p>
                                    <div className="flex items-center gap-4 p-4 bg-[#39FF14]/5 border border-[#39FF14]/10 rounded">
                                        <div className="shrink-0 w-16 h-16 rounded-full border-4 border-[#39FF14] border-t-transparent animate-spin-slow" style={{ animation: "spin 3s linear infinite" }}></div>
                                        <div>
                                            <div className="text-[10px] text-[#39FF14] uppercase font-bold">Credit Index</div>
                                            <div className="text-2xl font-black text-white brand-font">821.5</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="glass-panel p-8 group hover:border-[#39FF14] transition-all duration-500">
                                    <div className="h-12 w-12 bg-[#39FF14]/20 rounded flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-[#39FF14]">shield_person</span>
                                    </div>
                                    <h4 className="text-lg font-bold mb-3 text-white brand-font uppercase">Compliance Sentinel</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed mb-6">Interactive ASEAN Export Intel. Real-time regulatory mapping for international trade compliance.</p>
                                    <div className="flex gap-2 flex-wrap">
                                        <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-[#39FF14] border border-[#39FF14]/20">MALAYSIA</span>
                                        <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-500 border border-slate-700">VIETNAM</span>
                                        <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-500 border border-slate-700">THAILAND</span>
                                    </div>
                                </div>
                                <div className="glass-panel p-8 group hover:border-[#39FF14] transition-all duration-500">
                                    <div className="h-12 w-12 bg-[#39FF14]/20 rounded flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-[#39FF14]">movie_edit</span>
                                    </div>
                                    <h4 className="text-lg font-bold mb-3 text-white brand-font uppercase">VernStudio</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed mb-6">Snap & Sell 2.0 - Generate 8s vertical video ads with Bario Rice and local craft showcases instantly.</p>
                                    <div className="aspect-9/16 h-32 mx-auto bg-slate-900 rounded border border-[#39FF14]/20 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-linear-to-t from-[#39FF14]/20 to-transparent"></div>
                                        <div className="absolute bottom-2 left-2 right-2 h-1 bg-white/20 rounded-full">
                                            <div className="w-1/2 h-full bg-[#39FF14]"></div>
                                        </div>
                                        <img className="w-full h-full object-cover" data-alt="Vertical mobile advertisement of Bario Rice" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8-kPAYePjwABPac9UjchvpC6I4EhvkiskQugeqqRlt-rrCwZYBsBf-lomSw6SYg_pQAhJFmkqpEQYOkTLoiwH4AjqccbIujP7IXlGUI7AbZqUWCxJ5V6ibVgRBlqwK0PyTOTsvNOVdvaPu9nbFocPJuUd0osldHdbek2bgRvVqX0boWGbiOkyRJB3VXNqcv97hH41r_xUTG2z13cYUniUXihjvgznxVhhAYzhdOpv69sgthZjVZs2kSRtDIg26aDYv_Ev10q4kY8" />
                                    </div>
                                </div>
                                <div className="glass-panel p-8 group hover:border-[#39FF14] transition-all duration-500">
                                    <div className="h-12 w-12 bg-[#39FF14]/20 rounded flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-[#39FF14]">chat_bubble</span>
                                    </div>
                                    <h4 className="text-lg font-bold mb-3 text-white brand-font uppercase">WhatsApp Automation</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed mb-6">Import invoice from customer</p>
                                    <div className="space-y-2 opacity-50 text-[10px]">
                                        <div className="p-2 bg-slate-800 rounded ml-4 border-l-2 border-[#39FF14]">Order: 5kg Black Rice</div>
                                        <div className="p-2 bg-slate-900 rounded mr-4 border-r-2 border-slate-700">Importing invoice from customer...</div>
                                    </div>
                                </div>
                                <div className="glass-panel p-8 group hover:border-[#39FF14] transition-all duration-500">
                                    <div className="h-12 w-12 bg-[#39FF14]/20 rounded flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-[#39FF14]">query_stats</span>
                                    </div>
                                    <h4 className="text-lg font-bold mb-3 text-white brand-font uppercase">Predictive Analytics</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed mb-6">Automated revenue forecasts + AI-driven strategic directives for seasonal harvest cycles.</p>
                                    <div className="h-24 flex items-end gap-1">
                                        <div className="grow bg-[#39FF14]/10 h-[40%]"></div>
                                        <div className="grow bg-[#39FF14]/30 h-[60%]"></div>
                                        <div className="grow bg-[#39FF14]/50 h-[45%]"></div>
                                        <div className="grow bg-[#39FF14]/80 h-[85%] shadow-[0_0_10px_#39FF14]"></div>
                                        <div className="grow bg-[#39FF14]/20 h-[30%]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="py-24 px-6 border-t border-[#39FF14]/10">
                        <div className="max-w-7xl mx-auto">
                            <div className="text-center mb-16">
                                <h2 className="text-[#39FF14] font-bold tracking-[0.3em] uppercase mb-4 brand-font text-xs">Social Impact</h2>
                                <h3 className="text-4xl font-bold text-white uppercase">SDG INTEGRATION</h3>
                            </div>
                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="glass-panel p-8 text-center rounded-xl">
                                    <div className="w-16 h-16 bg-[#A21942] mx-auto flex items-center justify-center rounded-lg mb-6 shadow-lg shadow-[#A21942]/20">
                                        <span className="text-white font-black text-2xl brand-font">8</span>
                                    </div>
                                    <h4 className="text-base font-bold text-white mb-2 uppercase tracking-wide brand-font">Decent Work</h4>
                                    <p className="text-slate-400 text-xs">Empowering informal traders with digital identities and financial inclusivity through autonomous ledger systems.</p>
                                </div>
                                <div className="glass-panel p-8 text-center rounded-xl">
                                    <div className="w-16 h-16 bg-[#FD6925] mx-auto flex items-center justify-center rounded-lg mb-6 shadow-lg shadow-[#FD6925]/20">
                                        <span className="text-white font-black text-2xl brand-font">9</span>
                                    </div>
                                    <h4 className="text-base font-bold text-white mb-2 uppercase tracking-wide brand-font">Innovation</h4>
                                    <p className="text-slate-400 text-xs">Building resilient infrastructure for Sarawak's MSMEs using localized AI and OCR technologies.</p>
                                </div>
                                <div className="glass-panel p-8 text-center rounded-xl">
                                    <div className="w-16 h-16 bg-[#DD1367] mx-auto flex items-center justify-center rounded-lg mb-6 shadow-lg shadow-[#DD1367]/20">
                                        <span className="text-white font-black text-2xl brand-font">10</span>
                                    </div>
                                    <h4 className="text-base font-bold text-white mb-2 uppercase tracking-wide brand-font">Reduced Inequality</h4>
                                    <p className="text-slate-400 text-xs">Closing the digital divide between rural artisans and global market standards using cybernetic intelligence.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="py-24 px-6 relative">
                        <div className="max-w-4xl mx-auto">
                            <div className="glass-panel rounded-lg border-2 border-[#39FF14]/30 overflow-hidden shadow-[0_0_30px_rgba(57,255,20,0.1)]">
                                <div className="bg-[#39FF14]/10 border-b border-[#39FF14]/20 px-4 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                            <div className="w-3 h-3 rounded-full bg-[#39FF14]/50"></div>
                                        </div>
                                        <span className="ml-4 text-[10px] text-[#39FF14]/70 uppercase tracking-widest font-bold">Terminal // root@pintar-ai</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500">SYSTEM_OVERRIDE_V4.0</div>
                                </div>
                                <div className="p-8 md:p-12 text-center bg-black/40">
                                    <div className="mb-8">
                                        <div className="text-[#39FF14] mb-4 text-sm font-bold tracking-[0.2em] uppercase">Ready for deployment</div>
                                        <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-4">Run PINTAR.ai startup sequence?</h2>
                                        <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">Initiate neural bridge for ASEAN MSMEs. Execute the core engine to begin automated ledger processing and credit scoring.</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                        <button className="w-full sm:w-auto px-10 py-4 bg-[#39FF14] text-black font-black rounded text-sm tracking-widest hover:bg-white transition-all neon-glow uppercase flex items-center justify-center gap-3 group">
                                            <span className="material-symbols-outlined text-sm">terminal</span>
                                            <Link href="/sign-up" className="flex items-center">
                                                EXECUTE
                                                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">chevron_right</span>
                                            </Link>
                                        </button>
                                        <button className="w-full sm:w-auto px-10 py-4 border border-[#39FF14]/30 text-[#39FF14] font-bold rounded text-sm tracking-widest hover:bg-[#39FF14]/10 transition-all uppercase flex items-center justify-center gap-3">
                                            <span className="material-symbols-outlined text-sm">menu_book</span>
                                            <Link href="https://github.com/nathanyap17/pintar_ai" target="_blank" className="flex items-center">
                                                REVIEW DOCS
                                            </Link>
                                        </button>
                                    </div>
                                    <div className="mt-12 pt-8 border-t border-[#39FF14]/10 flex flex-wrap justify-center gap-8 text-[10px] text-[#39FF14]/40 uppercase tracking-[0.2em]">
                                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#39FF14] rounded-full animate-pulse"></div> Network: Online</div>
                                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#39FF14] rounded-full animate-pulse"></div> Secure Link: Enabled</div>
                                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#39FF14] rounded-full animate-pulse"></div> Region: ASEAN</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
                <footer className="py-12 px-6 border-t border-[#39FF14]/20 glass-panel">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-3">
                            <img alt="PINTAR.ai Logo" className="w-8 h-8 object-contain" src="/logo.png" />
                            <span className="text-lg font-bold text-[#39FF14] brand-font"><span className="text-white uppercase">PINTAR</span>.ai</span>
                        </div>
                        <div className="text-slate-500 text-[10px] tracking-widest uppercase text-center md:text-left">
                            © 2026 PINTAR.ai | <span className="text-[#39FF14]/60">Platform for inclusive trade & ai resilience | asianbananasplit</span>
                        </div>
                        <div className="flex gap-6">
                            <a className="text-slate-400 hover:text-[#39FF14] transition-colors" href="#">
                                <span className="material-symbols-outlined">public</span>
                            </a>
                            <a className="text-slate-400 hover:text-[#39FF14] transition-colors" href="#">
                                <span className="material-symbols-outlined">shield</span>
                            </a>
                            <a className="text-slate-400 hover:text-[#39FF14] transition-colors" href="#">
                                <span className="material-symbols-outlined">alternate_email</span>
                            </a>
                        </div>
                    </div>
                </footer>
            </div>

        </div>
    );
}

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing">
      {/* Background Effects */}
      <div className="bg-effects">
        <div className="bg-grid" />
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-line-1" />
        <div className="bg-line-2" />
      </div>

      {/* Floating Nav */}
      <div className="floating-nav">
        <nav className="floating-nav-inner">
          <div className="nav-brand-group">
            <div className="nav-brand-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>smart_toy</span>
            </div>
            <span className="nav-brand-text">PINTAR<span className="dot">.ai</span></span>
          </div>
          <div className="nav-links">
            <a href="#intelligence">Intelligence</a>
            <a href="#modules">Features</a>
            <a href="#footer">Pricing</a>
          </div>
          <Link href="/dashboard" className="nav-cta">Get Started</Link>
        </nav>
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="hero-text-center">
          <h1 className="text-center">
            Inclusive <br />
            <span className="outline">Growth</span>{" "}
            <span className="accent">Engine</span>
          </h1>
          <p className="hero-subtitle">
            A decentralized intelligence layer for ASEAN MSMEs. <br className="hidden-mobile" />
            Connect, analyze, and scale with sharp-edge AI precision.
          </p>
        </div>

        {/* Hub Cards */}
        <div className="hub-cards-container">
          <div className="hub-cards-glow" />
          <div className="hub-cards-row">
            {/* Growth Vector Card */}
            <div className="hub-card">
              <div className="hub-card-icon">
                <span className="material-symbols-outlined">monitoring</span>
              </div>
              <div>
                <p className="hub-card-label">Real-time Data</p>
                <h3 className="hub-card-value">142%</h3>
                <p style={{ fontSize: 12, color: "#4ade80", fontFamily: "monospace", marginTop: 4 }}>▲ Growth Vector</p>
              </div>
              <div className="mini-bars">
                <div style={{ height: "40%", background: "rgba(124,58,237,0.2)" }} />
                <div style={{ height: "70%", background: "rgba(124,58,237,0.4)" }} />
                <div style={{ height: "55%", background: "#7c3aed", boxShadow: "0 0 10px rgba(168,85,247,0.5)" }} />
                <div style={{ height: "80%", background: "rgba(124,58,237,0.4)" }} />
              </div>
              <div className="hub-card-footer">
                <span>Updated: Just now</span>
                <div className="hub-card-dot" />
              </div>
            </div>

            {/* Neural Connect — Core Card */}
            <div className="hub-card hub-card-core">
              <div className="hub-card-badge">Core Engine v2.0</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 24 }}>
                <div className="spin-rings">
                  <div className="spin-ring spin-ring-1" />
                  <div className="spin-ring spin-ring-2" />
                  <div className="spin-ring-icon">
                    <span className="material-symbols-outlined">psychology</span>
                  </div>
                </div>
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Neural Connect</h2>
                  <p style={{ fontSize: 14, color: "rgba(216,180,254,0.6)", lineHeight: 1.6 }}>Processing cross-border transactions and market sentiment analysis for 10 ASEAN regions simultaneously.</p>
                </div>
              </div>
              <button className="hub-card-btn">Initiate Sequence</button>
            </div>

            {/* Logistics Card */}
            <div className="hub-card">
              <div className="hub-card-icon">
                <span className="material-symbols-outlined">local_shipping</span>
              </div>
              <div>
                <p className="hub-card-label">Logistics Chain</p>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>Smart Route<br />Optimization</h3>
              </div>
              <div className="route-map">
                <div className="route-map-dots" />
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  <path d="M 30 100 Q 80 40 150 80 T 270 50" fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="4 4" opacity="0.8">
                    <animate attributeName="stroke-dashoffset" from="100" to="0" dur="3s" repeatCount="indefinite" />
                  </path>
                  <circle cx="30" cy="100" r="4" fill="#a78bfa" />
                  <circle cx="270" cy="50" r="4" fill="#a78bfa" />
                </svg>
                <div className="route-map-overlay">
                  <span style={{ color: "#9ca3af" }}>ETA: -40%</span>
                  <span style={{ color: "#7c3aed", fontWeight: 700 }}>Optimized</span>
                </div>
              </div>
            </div>

            {/* Auto Compliance Card */}
            <div className="hub-card">
              <div className="hub-card-icon">
                <span className="material-symbols-outlined">gavel</span>
              </div>
              <div>
                <p className="hub-card-label">Reg-Tech</p>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "#fff" }}>Auto Compliance</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                <div className="compliance-row">
                  <div className="compliance-dot compliance-dot-green">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#cbd5e1" }}>Tax Regulation (SG)</span>
                </div>
                <div className="compliance-row">
                  <div className="compliance-dot compliance-dot-green">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#cbd5e1" }}>Import Duties (ID)</span>
                </div>
                <div className="compliance-row">
                  <div className="compliance-dot compliance-dot-purple" style={{ animation: "pulse 2s infinite" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>sync</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#cbd5e1" }}>Verifying Customs (VN)...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Prompt */}
        <div className="scroll-prompt">
          <span>Scroll to Explore</span>
          <span className="material-symbols-outlined" style={{ color: "#fff" }}>keyboard_arrow_down</span>
        </div>
      </section>

      {/* Hyper-Localized Intelligence */}
      <section className="intelligence-section" id="intelligence">
        <div className="intelligence-grid">
          <div>
            <h2 className="intelligence-title">
              Hyper-Localized <br />
              <span className="italic">Intelligence</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { title: "Deep Market Penetration", desc: "Identify micro-trends in rural and urban sectors across Southeast Asia." },
                { title: "Unified Settlement Layer", desc: "Instant cross-currency settlements bypassing traditional banking delays." },
                { title: "Predictive Supply Chain", desc: "Anticipate disruptions from monsoon seasons to regulatory shifts." },
              ].map((f, i) => (
                <label
                  key={i}
                  className="feature-label"
                  onClick={() => setActiveFeature(i)}
                >
                  <div className="feature-label-inner" style={activeFeature === i ? { background: "rgba(255,255,255,0.05)" } : {}}>
                    <div className="feature-indicator" style={activeFeature === i ? { background: "linear-gradient(to bottom, #7c3aed, transparent)", opacity: 1 } : {}} />
                    <div style={{ paddingLeft: 16 }}>
                      <h3 style={activeFeature === i ? { color: "#d8b4fe" } : {}}>{f.title}</h3>
                      <p>{f.desc}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rings-container">
            <div className="rotating-rings">
              <div className="ring-1" />
              <div className="ring-2" />
              <div className="ring-3" />
              <div className="ring-glow" />

              {[
                { icon: "query_stats", title: "Trend Analysis", desc: "Processing millions of micro-transactions to detect emerging consumer behaviors in rural ASEAN markets.", color: "var(--primary)", bgColor: "rgba(124,58,237,0.2)", borderColor: "rgba(124,58,237,0.4)" },
                { icon: "currency_exchange", title: "Smart Ledger", desc: "Automated reconciliation of multi-currency transactions with 99.9% accuracy and zero delay.", color: "var(--primary-light)", bgColor: "rgba(167,139,250,0.2)", borderColor: "rgba(167,139,250,0.4)" },
                { icon: "local_shipping", title: "Route AI", desc: "Dynamic rerouting based on real-time weather data and border congestion metrics.", color: "var(--accent-lavender)", bgColor: "rgba(216,180,254,0.2)", borderColor: "rgba(216,180,254,0.4)" },
              ].map((card, i) => (
                <div key={i} className={`feature-detail-card ${activeFeature === i ? "active" : ""}`}>
                  <div className="feature-detail-icon" style={{ background: card.bgColor, color: card.color, border: `1px solid ${card.borderColor}` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{card.icon}</span>
                  </div>
                  <h4>{card.title}</h4>
                  <p>{card.desc}</p>
                  {i === 0 && (
                    <div className="feature-progress">
                      <div className="feature-progress-bar" style={{ width: "75%" }} />
                    </div>
                  )}
                  {i === 1 && (
                    <div style={{ marginTop: 24, width: "100%", display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "monospace", color: "var(--primary-light)" }}>
                      <span>SGD</span><span>IDR</span><span>MYR</span><span>THB</span><span>VND</span>
                    </div>
                  )}
                  {i === 2 && (
                    <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--accent-lavender)" }}>
                      <span style={{ animation: "pulse 2s infinite" }}>●</span> Live Tracking Active
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Modules */}
      <section className="modules-section" id="modules">
        <div className="modules-header">
          <h2>Interactive Modules</h2>
          <div className="modules-divider" />
        </div>
        <div className="modules-scroll">
          {[
            { icon: "query_stats", title: "Market Insights", desc: "AI-driven demand forecasting tailored to local micro-trends. Identify emerging product niches before your competitors do.", color: "var(--primary)", version: "v4.2.0", bgHover: "linear-gradient(to right, rgba(124,58,237,0.2), transparent)" },
            { icon: "hub", title: "Cross-Border Logistics", desc: "Seamless intra-ASEAN trade flows. Route optimization and customs clearance prediction that reduces delivery times by up to 40%.", color: "#c084fc", version: "v2.1.0", bgHover: "linear-gradient(to right, rgba(192,132,252,0.2), transparent)" },
            { icon: "gavel", title: "Smart Compliance", desc: "Navigate regulatory landscapes of 10 ASEAN nations. Our AI automatically updates your documentation for compliance in real-time.", color: "var(--accent-lavender)", version: "v1.8.5", bgHover: "linear-gradient(to right, rgba(216,180,254,0.2), transparent)" },
          ].map((mod, i) => (
            <div key={i} className="module-card">
              <div className="module-card-bg" />
              <div className="module-card-hover-bg" style={{ background: mod.bgHover }} />
              <div className="module-card-content">
                <div className="module-card-top">
                  <div className="module-icon-box">
                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: mod.color }}>{mod.icon}</span>
                  </div>
                  <span className="module-version">{mod.version}</span>
                </div>
                <div>
                  <h3>{mod.title}</h3>
                  <p>{mod.desc}</p>
                </div>
                <div className="module-link" style={{ color: mod.color }}>
                  Explore Module <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </div>
              </div>
              <div className="module-card-blur" style={{ background: `${mod.color}20`, opacity: 0.3 }} />
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer" id="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <span className="material-symbols-outlined">smart_toy</span>
              <span className="footer-brand-name">PINTAR<span className="dot">.ai</span></span>
            </div>
            <div className="footer-links">
              <a href="#">Platform</a>
              <a href="#">Technology</a>
              <a href="#">Contact</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copy">
              © 2026 PINTAR.ai Technologies. <br />
              Designed for the future of inclusive growth.
            </p>
            <div className="footer-socials">
              <div className="footer-social-icon">Li</div>
              <div className="footer-social-icon">X</div>
              <div className="footer-social-icon">Ig</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

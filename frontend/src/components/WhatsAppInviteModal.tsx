"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

/**
 * WhatsAppInviteModal — First-login pop-up for real (non-demo) users.
 * Invites them to link their WhatsApp for autonomous ledger tracking.
 * 
 * - Shows once per user (localStorage persistence)
 * - "Link Now" navigates to Shadow Ledger page (where the QR lives)
 * - "Maybe Later" dismisses and stores preference
 */

const DEMO_CLERK_ID = process.env.NEXT_PUBLIC_DEMO_CLERK_ID || "";

export default function WhatsAppInviteModal() {
    const { user } = useUser();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!user) return;
        // Don't show for demo account
        if (user.id === DEMO_CLERK_ID) return;

        const key = `pintar_wa_invite_dismissed_${user.id}`;
        const dismissed = localStorage.getItem(key);
        if (!dismissed) {
            // Small delay so it doesn't flash on page load
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [user]);

    const dismiss = () => {
        if (user) {
            localStorage.setItem(`pintar_wa_invite_dismissed_${user.id}`, "true");
        }
        setVisible(false);
    };

    const linkNow = () => {
        dismiss();
        window.location.href = "/shadow-ledger";
    };

    if (!visible) return null;

    return (
        <div className="cmd-modal-overlay" onClick={dismiss}>
            <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
                <div className="cmd-modal-icon-wrap">
                    <span className="material-symbols-outlined cmd-modal-icon">
                        phonelink_setup
                    </span>
                </div>

                <h3 className="cmd-modal-title">Link Your WhatsApp</h3>
                <p className="cmd-modal-desc">
                    Automate your Shadow Ledger by linking your WhatsApp Business account.
                    Every customer message — orders, payments, receipts — will be
                    automatically tracked and classified.
                </p>

                <div className="cmd-modal-features">
                    <div className="cmd-modal-feature">
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#10b981" }}>check_circle</span>
                        <span>Zero manual data entry</span>
                    </div>
                    <div className="cmd-modal-feature">
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#10b981" }}>check_circle</span>
                        <span>Real-time dashboard updates</span>
                    </div>
                    <div className="cmd-modal-feature">
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#10b981" }}>check_circle</span>
                        <span>Supports text, images & voice notes</span>
                    </div>
                </div>

                <div className="cmd-modal-actions">
                    <button onClick={linkNow} className="cmd-modal-btn-primary">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>qr_code_2</span>
                        Link Now
                    </button>
                    <button onClick={dismiss} className="cmd-modal-btn-secondary">
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}

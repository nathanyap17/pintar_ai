"use client";

/**
 * TwilioTestCard — Demo-only component showing the Twilio sandbox
 * phone number and instructions for visitors to test the Agentic
 * Shadow Ledger by sending text/images to the WhatsApp number.
 */
export default function TwilioTestCard() {
    const twilioNumber = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || "+14155238886";

    return (
        <div className="cmd-twilio-card">
            <div className="cmd-twilio-header">
                <span className="material-symbols-outlined cmd-twilio-icon">smart_toy</span>
                <div>
                    <h3 className="cmd-twilio-title">AGENTIC SHADOW LEDGER</h3>
                    <p className="cmd-twilio-sub">
                        Autonomous transaction ingestion via WhatsApp
                    </p>
                </div>
                <div className="cmd-agentic-badge cmd-agentic-active">
                    <span className="cmd-live-dot" />
                    ACTIVE
                </div>
            </div>

            <div className="cmd-twilio-body">
                <div className="cmd-twilio-invite">
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#22d3ee" }}>
                        chat
                    </span>
                    <div>
                        <p className="cmd-twilio-invite-title">
                            Try it now — Send a message to our WhatsApp
                        </p>
                        <p className="cmd-twilio-invite-desc">
                            Send any transaction text (e.g., <strong>&ldquo;RM300 for Beras Bario&rdquo;</strong>) or a receipt photo,
                            and watch the dashboard update in real-time.
                        </p>
                    </div>
                </div>

                <div className="cmd-twilio-number-box">
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#10b981" }}>
                        phone_iphone
                    </span>
                    <div>
                        <span className="cmd-twilio-number-label">WhatsApp Sandbox Number</span>
                        <span className="cmd-twilio-number">{twilioNumber}</span>
                    </div>
                </div>

                <div className="cmd-twilio-steps">
                    <div className="cmd-twilio-step">
                        <span className="cmd-twilio-step-num">1</span>
                        <span>Save the number above and open WhatsApp</span>
                    </div>
                    <div className="cmd-twilio-step">
                        <span className="cmd-twilio-step-num">2</span>
                        <span>Send: <code>join &lt;sandbox-code&gt;</code> to activate</span>
                    </div>
                    <div className="cmd-twilio-step">
                        <span className="cmd-twilio-step-num">3</span>
                        <span>Send a transaction message or receipt photo</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

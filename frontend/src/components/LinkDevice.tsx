"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import QRCode from "react-qr-code";

/**
 * LinkDevice — QR-based WhatsApp linking for the Native Pipeline.
 * 
 * Connects to the Node.js WhatsApp Microservice (:3001) via Socket.io.
 * The MSME scans a QR code once, and from that point, ALL incoming
 * customer messages are silently intercepted and processed.
 * 
 * States: disconnected → waiting (QR shown) → connected (LIVE monitoring)
 */

// Dynamically import socket.io-client to avoid SSR issues
let ioConnect: any = null;
if (typeof window !== "undefined") {
    import("socket.io-client").then((mod) => {
        ioConnect = mod.io;
    });
}

interface IngestedTransaction {
    sender: string;
    preview: string;
    hasMedia: boolean;
    timestamp: number;
}

export default function LinkDevice() {
    const { user } = useUser();
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<"disconnected" | "waiting" | "connected" | "reconnecting">("disconnected");
    const [error, setError] = useState<string>("");
    const [reconnectInfo, setReconnectInfo] = useState<string>("");
    const [recentIngests, setRecentIngests] = useState<IngestedTransaction[]>([]);
    const [socket, setSocket] = useState<any>(null);

    const startSession = () => {
        if (!user || !ioConnect) return;
        setError("");
        setReconnectInfo("");
        setStatus("waiting");

        const sock = ioConnect("http://localhost:3001");
        setSocket(sock);

        sock.on("connect", () => {
            sock.emit("start_session", { clerkId: user.id });
        });

        sock.on("qr_code", (data: { qr: string }) => {
            setQrCode(data.qr);
            setStatus("waiting");
        });

        sock.on("session_status", (data: { status: string; reason?: string; attempt?: number; nextRetryMs?: number }) => {
            if (data.status === "connected" || data.status === "already_connected") {
                setStatus("connected");
                setQrCode(null);
                setReconnectInfo("");
            } else if (data.status === "reconnecting") {
                setStatus("reconnecting");
                setQrCode(null);
                const secs = Math.round((data.nextRetryMs || 5000) / 1000);
                setReconnectInfo(`Reconnecting (attempt ${data.attempt}/5) in ${secs}s...`);
            } else if (data.status === "disconnected") {
                setStatus("disconnected");
                setQrCode(null);
                if (data.reason) setError(data.reason);
            }
        });

        sock.on("session_error", (data: { message: string }) => {
            setError(data.message);
            setStatus("disconnected");
        });

        sock.on("transaction_ingested", (data: IngestedTransaction) => {
            setRecentIngests((prev) => [data, ...prev].slice(0, 5));
        });

        sock.on("connect_error", () => {
            setError("Cannot reach WhatsApp service. Is it running on port 3001?");
            setStatus("disconnected");
        });
    };

    const stopSession = () => {
        if (socket && user) {
            socket.emit("stop_session", { clerkId: user.id });
            socket.disconnect();
            setSocket(null);
            setStatus("disconnected");
            setQrCode(null);
        }
    };

    useEffect(() => {
        return () => {
            if (socket) socket.disconnect();
        };
    }, [socket]);

    return (
        <div className="cmd-link-device">
            <div className="cmd-link-header">
                <span className="material-symbols-outlined cmd-link-icon">
                    {status === "connected" ? "link" : "phonelink_setup"}
                </span>
                <div>
                    <h3 className="cmd-link-title">
                        {status === "connected" ? "DEVICE LINKED" : "LINK WHATSAPP"}
                    </h3>
                    <p className="cmd-link-sub">
                        {status === "connected"
                            ? "Neural Ledger actively monitoring in background"
                            : "Connect your WhatsApp Business for autonomous ingestion"}
                    </p>
                </div>

                {status === "disconnected" && (
                    <button onClick={startSession} className="cmd-link-btn">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>qr_code_2</span>
                        Initialize
                    </button>
                )}

                {status === "connected" && (
                    <button onClick={stopSession} className="cmd-link-disconnect-btn">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link_off</span>
                        Disconnect
                    </button>
                )}
            </div>

            {/* Error state */}
            {error && (
                <div className="cmd-link-error">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                    {error}
                </div>
            )}

            {/* QR Code (waiting state) */}
            {status === "waiting" && qrCode && (
                <div className="cmd-link-qr-container">
                    <p className="cmd-link-qr-label">
                        SCAN WITH WHATSAPP TO INITIALIZE SHADOW LEDGER
                    </p>
                    <div className="cmd-link-qr-box">
                        <QRCode
                            value={qrCode}
                            size={200}
                            bgColor="#ffffff"
                            fgColor="#0a0f1a"
                            level="M"
                        />
                    </div>
                    <p className="cmd-link-qr-hint">
                        Open WhatsApp → Settings → Linked Devices → Link a Device
                    </p>
                </div>
            )}

            {status === "waiting" && !qrCode && (
                <div className="cmd-link-qr-container">
                    <div className="cmd-link-loading">
                        <span className="material-symbols-outlined cmd-spin" style={{ fontSize: 28, color: "#22d3ee" }}>
                            progress_activity
                        </span>
                        <p>Initializing WhatsApp connection...</p>
                    </div>
                </div>
            )}

            {/* Reconnecting state */}
            {status === "reconnecting" && (
                <div className="cmd-link-qr-container">
                    <div className="cmd-link-loading">
                        <span className="material-symbols-outlined cmd-spin" style={{ fontSize: 28, color: "#f59e0b" }}>
                            sync
                        </span>
                        <p>{reconnectInfo || "Reconnecting..."}</p>
                    </div>
                </div>
            )}

            {/* Connected state with live indicator */}
            {status === "connected" && (
                <div className="cmd-link-connected">
                    <div className="cmd-link-connected-badge">
                        <span className="cmd-live-dot" />
                        <span>LIVE — Autonomous Ingestion Active</span>
                    </div>

                    {/* Recent ingested transactions */}
                    {recentIngests.length > 0 && (
                        <div className="cmd-link-feed">
                            <div className="cmd-link-feed-label">Recent Intercepts</div>
                            {recentIngests.map((tx, i) => (
                                <div key={i} className="cmd-link-feed-item">
                                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#10b981" }}>
                                        {tx.hasMedia ? "image" : "chat"}
                                    </span>
                                    <span className="cmd-link-feed-preview">{tx.preview}</span>
                                    <span className="cmd-link-feed-time">
                                        {new Date(tx.timestamp).toLocaleTimeString("en-MY", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

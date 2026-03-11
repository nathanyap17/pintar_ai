"use client";

import { useUser } from "@clerk/nextjs";
import { SignIn } from "@clerk/nextjs";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isSignedIn, isLoaded } = useUser();

    if (!isLoaded) {
        return (
            <div className="auth-screen">
                <div className="auth-orb" />
                <div className="auth-loading">
                    <div className="auth-spinner" />
                    <span>Loading PINTAR.ai...</span>
                </div>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="auth-screen">
                <div className="auth-orb" />
                <div className="auth-card-wrapper">
                    <h2>PINTAR<span className="dot">.ai</span></h2>
                    <p className="auth-sub">Inclusive Growth Engine</p>
                    <SignIn
                        routing="hash"
                        appearance={{
                            variables: {
                                colorPrimary: "#7c3aed",
                                colorBackground: "#1e1b2e",
                                colorText: "#f8fafc",
                                colorInputBackground: "rgba(255,255,255,0.1)",
                                colorInputText: "#f8fafc",
                                borderRadius: "8px",
                            },
                            elements: {
                                card: {
                                    background: "#1e1b2e",
                                    backdropFilter: "blur(20px)",
                                    border: "1px solid rgba(167,139,250,0.2)",
                                    boxShadow: "0 0 40px rgba(124,58,237,0.2)",
                                },
                                formButtonPrimary: {
                                    background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                                    boxShadow: "0 0 15px rgba(124,58,237,0.3)",
                                },
                                formFieldInput: {
                                    background: "rgba(255,255,255,0.08)",
                                    borderColor: "rgba(167,139,250,0.2)",
                                    color: "#f8fafc",
                                },
                                socialButtonsBlockButton: {
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(167,139,250,0.15)",
                                    color: "#e2e8f0",
                                },
                                footerActionLink: {
                                    color: "#a78bfa",
                                },
                            },
                        }}
                    />
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

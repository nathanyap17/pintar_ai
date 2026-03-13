"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050804] relative overflow-hidden">
            {/* Background grid */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, rgba(57,255,20,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(57,255,20,0.05) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            {/* Glow effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#39FF14]/5 rounded-full blur-3xl" />

            <div className="relative z-10">
                <SignIn
                    afterSignInUrl="/dashboard"
                    appearance={{
                        variables: {
                            colorPrimary: "#39FF14",
                            colorBackground: "#0a0f08",
                            colorInputBackground: "#111a0e",
                            colorText: "#e0e0e0",
                            colorTextSecondary: "#94a3b8",
                            borderRadius: "8px",
                        },
                        elements: {
                            card: {
                                backgroundColor: "#0a0f08",
                                border: "1px solid rgba(57,255,20,0.2)",
                                boxShadow: "0 0 30px rgba(57,255,20,0.1)",
                            },
                            headerTitle: { color: "#e0e0e0" },
                            headerSubtitle: { color: "#94a3b8" },
                            formFieldLabel: { color: "#cbd5e1" },
                            formFieldInput: {
                                backgroundColor: "#111a0e",
                                color: "#e0e0e0",
                                borderColor: "rgba(57,255,20,0.15)",
                            },
                            formButtonPrimary: {
                                backgroundColor: "#39FF14",
                                color: "#000",
                                fontWeight: "700",
                            },
                            footerActionLink: { color: "#39FF14" },
                            socialButtonsBlockButton: {
                                borderColor: "rgba(57,255,20,0.2)",
                                color: "#e0e0e0",
                            },
                        },
                    }}
                />
            </div>
        </div>
    );
}

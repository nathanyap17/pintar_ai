"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import ProfileSync from "@/components/ProfileSync";

const convex = new ConvexReactClient(
    process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export default function ConvexClerkProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider
            appearance={{
                variables: {
                    colorPrimary: "#14b8a6",
                    colorBackground: "#111827",
                    colorInputBackground: "#1f2937",
                    colorText: "#f1f5f9",
                    colorTextSecondary: "#94a3b8",
                    borderRadius: "12px",
                },
                elements: {
                    card: { backgroundColor: "#111827" },
                    headerTitle: { color: "#f1f5f9" },
                    headerSubtitle: { color: "#94a3b8" },
                    formFieldLabel: { color: "#cbd5e1" },
                    formFieldInput: {
                        backgroundColor: "#1f2937",
                        color: "#f1f5f9",
                        borderColor: "rgba(255,255,255,0.08)",
                    },
                    footerActionLink: { color: "#14b8a6" },
                },
            }}
        >
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                <ProfileSync />
                {children}
            </ConvexProviderWithClerk>
        </ClerkProvider>
    );
}


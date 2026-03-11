"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef } from "react";

/**
 * ProfileSync — Auto-creates a Convex profile when a Clerk user logs in.
 * 
 * This component renders nothing visible. It runs once on mount and calls
 * the profiles.upsert mutation which creates a new profile or returns the
 * existing one (idempotent).
 */
export default function ProfileSync() {
    const { user, isLoaded } = useUser();
    const upsertProfile = useMutation(api.profiles.upsert);
    const synced = useRef(false);

    useEffect(() => {
        if (!isLoaded || !user || synced.current) return;
        synced.current = true;

        upsertProfile({
            clerkId: user.id,
            businessName: user.fullName || undefined,
        }).catch((err) => {
            console.warn("Profile sync failed:", err);
            synced.current = false; // Allow retry
        });
    }, [isLoaded, user]);

    return null; // Invisible component
}

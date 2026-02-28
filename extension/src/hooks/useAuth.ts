import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";

export function useAuth() {
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setSessionLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setSessionLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleSocialLogin = async (provider: "google" | "github") => {
        setAuthLoading(true);
        setAuthError(null);

        try {
            // 1. Get Extension ID for redirect URL
            const redirectUrl = chrome.identity.getRedirectURL();

            // 2. Start OAuth flow with Supabase
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                    queryParams:
                        provider === "google"
                            ? {
                                prompt: "select_account",
                            }
                            : undefined,
                },
            });

            if (error) throw error;
            if (!data?.url) throw new Error("No OAuth URL returned");

            // 3. Launch Chrome Web Auth Flow
            chrome.identity.launchWebAuthFlow(
                {
                    url: data.url,
                    interactive: true,
                },
                async (redirectUri) => {
                    if (chrome.runtime.lastError) {
                        setAuthError(
                            chrome.runtime.lastError.message || "Authentication failed",
                        );
                        setAuthLoading(false);
                        return;
                    }

                    if (!redirectUri) {
                        setAuthError("No redirect URI returned");
                        setAuthLoading(false);
                        return;
                    }

                    // 4. Parse the hash from the redirect URI
                    const url = new URL(redirectUri);
                    const hash = url.hash.substring(1);
                    const params = new URLSearchParams(hash);

                    const accessToken = params.get("access_token");
                    const refreshToken = params.get("refresh_token");

                    if (!accessToken || !refreshToken) {
                        const errorDescription =
                            params.get("error_description") || "Authentication incomplete";
                        setAuthError(errorDescription);
                        setAuthLoading(false);
                        return;
                    }

                    // 5. Set the session in Supabase
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) {
                        setAuthError(sessionError.message);
                    }

                    setAuthLoading(false);
                },
            );
        } catch (err: any) {
            console.error("Login failed:", err);
            setAuthError(err.message || "An unexpected error occurred");
            setAuthLoading(false);
        }
    };

    return {
        session,
        authLoading,
        authError,
        sessionLoading,
        handleLogout,
        handleSocialLogin,
    };
}

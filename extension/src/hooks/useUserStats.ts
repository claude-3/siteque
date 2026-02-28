import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";

export function useUserStats(session: Session | null) {
    const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
    const [totalNoteCount, setTotalNoteCount] = useState<number>(0);
    const [userStatsLoading, setUserStatsLoading] = useState(true);

    useEffect(() => {
        const fetchUserStats = async () => {
            if (!session?.user?.id) return;

            // Fetch Profile
            const { data: profile } = await supabase
                .from("sitecue_profiles")
                .select("plan")
                .eq("id", session.user.id)
                .single();

            if (profile) {
                setUserPlan(profile.plan);
            }

            // Fetch Count
            const { count } = await supabase
                .from("sitecue_notes")
                .select("*", { count: "exact", head: true })
                .eq("user_id", session.user.id);

            if (count !== null) {
                setTotalNoteCount(count);
            }
        };

        if (session) {
            setUserStatsLoading(true);
            fetchUserStats().finally(() => setUserStatsLoading(false));
        }
    }, [session]);

    return {
        userPlan,
        totalNoteCount,
        setTotalNoteCount,
        userStatsLoading,
    };
}

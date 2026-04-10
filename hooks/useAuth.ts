"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";
import { getProfile, UserProfile } from "../lib/supabase/auth";

export interface AuthState {
  profile: UserProfile | null;
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(userId: string) {
      const p = await getProfile(userId);
      if (mounted) setProfile(p);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        if (session?.user) {
          loadProfile(session.user.id).finally(() => {
            if (mounted) setIsLoading(false);
          });
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setIsLoading(true);
        loadProfile(session.user.id).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { profile, isLoading };
}

"use client";
import { useEffect, useState } from "react";
import { testQuery } from "../lib/supabase/test";

export function useTest() {
  const [data, setData] = useState<unknown[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    testQuery()
      .then((d) => {
        if (!mounted) return;
        setData(Array.isArray(d) ? d : []);
      })
      .catch((e: unknown) => {
        if (mounted) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { data, isLoading, error };
}

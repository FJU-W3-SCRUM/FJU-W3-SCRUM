"use client";
import { useEffect, useState } from "react";
import { testQuery } from "../lib/supabase/test";

export function useTest() {
  const [data, setData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    testQuery()
      .then((d) => {
        if (mounted) setData(d ?? []);
      })
      .catch((e) => {
        if (mounted) setError(e);
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

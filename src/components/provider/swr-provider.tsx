"use client";

import { SWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false, // Prevent aggressive refetching on window focus to avoid unwanted flickering
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}

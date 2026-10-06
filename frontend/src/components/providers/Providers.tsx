"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/Tooltip";

import { AppUIProvider } from "./AppUIProvider";
import { ThemeProvider, useTheme } from "./ThemeProvider";

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="bottom-right"
      theme={theme}
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border-line !bg-surface !text-ink !shadow-pop !font-sans",
          description: "!text-ink-secondary",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider delayDuration={300}>
          <AppUIProvider>
            {children}
            <ThemedToaster />
          </AppUIProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

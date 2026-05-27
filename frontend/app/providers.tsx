"use client";

import React from "react";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/lib/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <ToastContainer />
      </ToastProvider>
    </AuthProvider>
  );
}

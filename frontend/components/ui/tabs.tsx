"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id || "");
  const current = activeTab ?? internalActive;

  const handleChange = (tabId: string) => {
    setInternalActive(tabId);
    onTabChange?.(tabId);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 p-1 bg-surface-2 rounded-card",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={current === tab.id}
          onClick={() => handleChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-button text-sm font-medium",
            "transition-all duration-200 min-h-touch",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            current === tab.id
              ? "bg-surface-1 text-text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-1/50"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface TabPanelProps {
  id: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ id, activeTab, children, className }: TabPanelProps) {
  if (id !== activeTab) return null;
  return (
    <div role="tabpanel" className={cn("animate-fade-in", className)}>
      {children}
    </div>
  );
}

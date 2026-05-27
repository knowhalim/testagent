"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { getEngineLabel, getEngineDescription } from "@/lib/utils";
import { ClipboardCheck, Eye, Users } from "lucide-react";

const engines = [
  {
    id: "uat" as const,
    icon: ClipboardCheck,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary",
  },
  {
    id: "ui_audit" as const,
    icon: Eye,
    color: "text-accent",
    bgColor: "bg-accent/10",
    borderColor: "border-accent",
  },
  {
    id: "ux_audit" as const,
    icon: Users,
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning",
  },
];

interface EngineSelectorProps {
  value: "uat" | "ui_audit" | "ux_audit";
  onChange: (engine: "uat" | "ui_audit" | "ux_audit") => void;
}

export function EngineSelector({ value, onChange }: EngineSelectorProps) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {engines.map((engine) => {
        const Icon = engine.icon;
        const isSelected = value === engine.id;
        return (
          <button
            key={engine.id}
            type="button"
            onClick={() => onChange(engine.id)}
            className={cn(
              "flex flex-col items-start p-4 rounded-card border-2 text-left",
              "transition-all duration-200 min-h-touch",
              isSelected
                ? `${engine.borderColor} bg-surface-2`
                : "border-border-subtle hover:border-border-default bg-surface-1"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-8 h-8 rounded-button ${engine.bgColor} flex items-center justify-center`}
              >
                <Icon className={`h-4 w-4 ${engine.color}`} />
              </div>
              <span className="text-sm font-semibold text-text-primary">
                {getEngineLabel(engine.id)}
              </span>
            </div>
            <p className="text-xs text-text-tertiary leading-relaxed">
              {getEngineDescription(engine.id)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";
import type { TestStep } from "@/lib/types";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  SkipForward,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

interface StepTimelineProps {
  steps: TestStep[];
  className?: string;
}

const statusConfig = {
  passed: {
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
    lineColor: "bg-success/30",
    label: "Passed",
  },
  failed: {
    icon: XCircle,
    color: "text-danger",
    bgColor: "bg-danger/10",
    lineColor: "bg-danger/30",
    label: "Failed",
  },
  running: {
    icon: Loader2,
    color: "text-info",
    bgColor: "bg-info/10",
    lineColor: "bg-info/30",
    label: "Running",
  },
  pending: {
    icon: Clock,
    color: "text-text-tertiary",
    bgColor: "bg-surface-2",
    lineColor: "bg-border-subtle",
    label: "Pending",
  },
  skipped: {
    icon: SkipForward,
    color: "text-text-tertiary",
    bgColor: "bg-surface-2",
    lineColor: "bg-border-subtle",
    label: "Skipped",
  },
};

function StepItem({
  step,
  isLast,
}: {
  step: TestStep;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[step.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="flex gap-4">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            config.bgColor
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              config.color,
              step.status === "running" && "animate-spin"
            )}
          />
        </div>
        {!isLast && (
          <div className={cn("w-0.5 flex-1 min-h-[2rem]", config.lineColor)} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-text-tertiary">
                #{step.step_number}
              </span>
              <span className="text-sm font-medium text-text-primary">
                {step.action}
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              {step.description}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {step.duration_ms != null && (
              <span className="text-xs text-text-tertiary font-mono">
                {formatDuration(step.duration_ms)}
              </span>
            )}
            {(step.screenshot_url || step.error_message) && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-3 animate-fade-in">
            {step.error_message && (
              <div className="p-3 bg-danger/5 border border-danger/20 rounded-button">
                <p className="text-sm text-danger font-mono">
                  {step.error_message}
                </p>
              </div>
            )}
            {step.screenshot_url && (
              <div className="rounded-card border border-border-subtle overflow-hidden">
                <img
                  src={step.screenshot_url}
                  alt={`Screenshot for step ${step.step_number}`}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function StepTimeline({ steps, className }: StepTimelineProps) {
  const sortedSteps = [...steps].sort(
    (a, b) => a.step_number - b.step_number
  );

  if (sortedSteps.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
        <p className="text-text-secondary">Waiting for test steps...</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {sortedSteps.map((step, index) => (
        <StepItem
          key={step.id}
          step={step}
          isLast={index === sortedSteps.length - 1}
        />
      ))}
    </div>
  );
}

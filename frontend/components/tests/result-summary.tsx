import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatDuration, formatCost, getStatusColor } from "@/lib/utils";
import type { Test } from "@/lib/types";
import { CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";

interface ResultSummaryProps {
  test: Test;
}

export function ResultSummary({ test }: ResultSummaryProps) {
  const passRate =
    test.total_steps > 0
      ? Math.round((test.passed_steps / test.total_steps) * 100)
      : 0;

  const stats = [
    {
      label: "Total Steps",
      value: test.total_steps,
      icon: Clock,
      color: "text-info",
    },
    {
      label: "Passed",
      value: test.passed_steps,
      icon: CheckCircle,
      color: "text-success",
    },
    {
      label: "Failed",
      value: test.failed_steps,
      icon: XCircle,
      color: "text-danger",
    },
    {
      label: "Duration",
      value: formatDuration(test.duration_ms),
      icon: Clock,
      color: "text-text-secondary",
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">
          Test Results
        </h3>
        <Badge
          variant={
            getStatusColor(test.status) as
              | "success"
              | "danger"
              | "warning"
              | "default"
              | "primary"
              | "accent"
          }
        >
          {test.status}
        </Badge>
      </div>

      {/* Pass rate bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-secondary">Pass Rate</span>
          <span className="text-sm font-semibold text-text-primary">
            {passRate}%
          </span>
        </div>
        <ProgressBar
          value={passRate}
          variant={passRate >= 80 ? "success" : passRate >= 50 ? "warning" : "danger"}
          size="md"
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="text-center p-3 bg-surface-2 rounded-button"
            >
              <Icon className={`h-5 w-5 mx-auto mb-1.5 ${stat.color}`} />
              <div className="text-lg font-bold text-text-primary">
                {stat.value}
              </div>
              <div className="text-xs text-text-tertiary">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Cost */}
      {test.cost != null && test.cost > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <DollarSign className="h-4 w-4" />
            Estimated Cost
          </div>
          <span className="text-sm font-medium text-text-primary">
            {formatCost(test.cost)}
          </span>
        </div>
      )}
    </Card>
  );
}

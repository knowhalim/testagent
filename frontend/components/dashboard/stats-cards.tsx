"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatRelativeDate, formatPassRate } from "@/lib/utils";
import type { DashboardStats } from "@/lib/types";
import { FlaskConical, TrendingUp, Clock, CalendarDays } from "lucide-react";

export function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardStats>("/dashboard/stats")
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Tests",
      value: stats?.total_tests ?? 0,
      icon: FlaskConical,
      color: "text-primary",
      bgColor: "bg-primary/10",
      description: "All time",
    },
    {
      label: "Pass Rate",
      value: formatPassRate(stats?.pass_rate),
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
      description: "Overall success",
    },
    {
      label: "Last Run",
      value: formatRelativeDate(stats?.last_run),
      icon: Clock,
      color: "text-info",
      bgColor: "bg-info/10",
      description: "Most recent test",
    },
    {
      label: "Tests Today",
      value: stats?.tests_today ?? 0,
      icon: CalendarDays,
      color: "text-accent",
      bgColor: "bg-accent/10",
      description: "In the last 24h",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-secondary">{card.label}</span>
              <div
                className={`w-8 h-8 rounded-button ${card.bgColor} flex items-center justify-center`}
              >
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {card.value}
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              {card.description}
            </p>
          </Card>
        );
      })}
    </div>
  );
}

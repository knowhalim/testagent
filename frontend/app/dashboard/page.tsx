"use client";

import React from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { QuickTest } from "@/components/dashboard/quick-test";
import { RecentTests } from "@/components/dashboard/recent-tests";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Overview of your testing activity
        </p>
      </div>

      <StatsCards />

      <div className="grid lg:grid-cols-2 gap-6">
        <QuickTest />
        <RecentTests />
      </div>
    </div>
  );
}

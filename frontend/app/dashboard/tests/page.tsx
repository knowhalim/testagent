"use client";

import React from "react";
import { TestHistoryTable } from "@/components/tests/test-history-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Test History
          </h1>
          <p className="text-text-secondary mt-1">
            View and manage all your tests
          </p>
        </div>
        <Link href="/dashboard/tests/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>New Test</Button>
        </Link>
      </div>

      <TestHistoryTable />
    </div>
  );
}

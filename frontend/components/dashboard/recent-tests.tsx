"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SkeletonTable } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import {
  formatRelativeDate,
  formatDuration,
  getStatusColor,
  getEngineLabel,
} from "@/lib/utils";
import type { Test } from "@/lib/types";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function RecentTests() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Test[]>("/dashboard/recent")
      .then(setTests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card padding="none">
      <CardHeader className="px-6 pt-6 pb-4 mb-0 border-b-0">
        <CardTitle>Recent Tests</CardTitle>
        <Link
          href="/dashboard/tests"
          className="text-sm text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>

      {loading ? (
        <div className="px-6 pb-6">
          <SkeletonTable rows={5} />
        </div>
      ) : tests.length === 0 ? (
        <div className="px-6 pb-6 text-center py-12">
          <p className="text-text-secondary">No tests yet. Run your first test above!</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Engine</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Duration</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests.map((test) => (
              <TableRow
                key={test.id}
                onClick={() => router.push(`/dashboard/tests/${test.id}`)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium truncate max-w-[200px]">
                      {test.name}
                    </p>
                    <p className="text-xs text-text-tertiary truncate max-w-[200px]">
                      {test.target_url}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-text-secondary">
                    {getEngineLabel(test.engine)}
                  </span>
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-text-secondary">
                    {formatDuration(test.duration_ms)}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-text-secondary">
                    {formatRelativeDate(test.created_at)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

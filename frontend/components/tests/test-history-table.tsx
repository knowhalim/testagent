"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { SkeletonTable } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import {
  formatRelativeDate,
  formatDuration,
  getStatusColor,
  getEngineLabel,
} from "@/lib/utils";
import type { Test, PaginatedResponse } from "@/lib/types";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const statusTabs = [
  { id: "all", label: "All" },
  { id: "running", label: "Running" },
  { id: "passed", label: "Passed" },
  { id: "failed", label: "Failed" },
  { id: "pending", label: "Pending" },
];

export function TestHistoryTable() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        per_page: "20",
      };
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const data = await api.get<PaginatedResponse<Test>>("/tests", params);
      setTests(data.items);
      setTotalPages(data.total_pages);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:max-w-xs">
          <Input
            placeholder="Search tests..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <Tabs
          tabs={statusTabs}
          activeTab={statusFilter}
          onTabChange={handleStatusChange}
        />
      </div>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={10} />
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">No tests found</p>
            <p className="text-sm text-text-tertiary mt-1">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Run your first test to see results here"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Name</TableHead>
                <TableHead>Engine</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Steps
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Duration
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Created
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow
                  key={test.id}
                  onClick={() =>
                    router.push(`/dashboard/tests/${test.id}`)
                  }
                >
                  <TableCell>
                    <div>
                      <p className="font-medium truncate max-w-[250px]">
                        {test.name}
                      </p>
                      <p className="text-xs text-text-tertiary truncate max-w-[250px]">
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
                    <span className="text-text-secondary text-sm">
                      {test.passed_steps}/{test.total_steps}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-text-secondary text-sm">
                      {formatDuration(test.duration_ms)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-text-secondary text-sm">
                      {formatRelativeDate(test.created_at)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
            <p className="text-sm text-text-tertiary">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Prev
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

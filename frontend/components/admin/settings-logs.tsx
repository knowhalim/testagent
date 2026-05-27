"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SkeletonTable } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { AdminLog, PaginatedResponse } from "@/lib/types";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

const levelColors: Record<string, "default" | "warning" | "danger"> = {
  info: "default",
  warning: "warning",
  error: "danger",
};

export function SettingsLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        per_page: "25",
      };
      if (search.trim()) params.search = search.trim();
      if (levelFilter !== "all") params.level = levelFilter;

      const data = await api.get<PaginatedResponse<AdminLog>>(
        "/admin/logs",
        params
      );
      const items = Array.isArray(data) ? data : (data.items || []);
      setLogs(items);
      setTotalPages((data as { total_pages?: number }).total_pages || 1);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [page, search, levelFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = () => {
    const csv = [
      ["Date", "Level", "Action", "User", "Details"].join(","),
      ...logs.map((log) =>
        [
          formatDate(log.created_at),
          log.level,
          `"${log.action}"`,
          `"${log.user_name}"`,
          `"${typeof log.details === "string" ? log.details : JSON.stringify(log.details).replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `testagent-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription className="mt-1">
            View system activity and audit trail
          </CardDescription>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExport}
          leftIcon={<Download className="h-4 w-4" />}
        >
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex items-center gap-2">
          {["all", "info", "warning", "error"].map((level) => (
            <button
              key={level}
              onClick={() => {
                setLevelFilter(level);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-button text-xs font-medium transition-colors min-h-touch flex items-center ${
                levelFilter === level
                  ? "bg-surface-2 text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={10} />
      ) : logs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">No logs found</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="hidden sm:table-cell">User</TableHead>
              <TableHead className="hidden md:table-cell">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <span className="text-xs font-mono text-text-secondary">
                    {formatDate(log.created_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={levelColors[log.level] || "default"}>
                    {log.level}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{log.action}</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-text-secondary">{log.user_name}</span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm text-text-tertiary truncate max-w-[300px] block">
                    {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
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
  );
}

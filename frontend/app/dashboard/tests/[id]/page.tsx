"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StepTimeline } from "@/components/tests/step-timeline";
import { ResultSummary } from "@/components/tests/result-summary";
import { useTestProgress } from "@/lib/hooks/use-sse";
import { api } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import {
  formatDate,
  formatDuration,
  getStatusColor,
  getEngineLabel,
} from "@/lib/utils";
import type { Test } from "@/lib/types";
import {
  ArrowLeft,
  ExternalLink,
  RotateCcw,
  Trash2,
  Loader2,
  Wifi,
} from "lucide-react";

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const testId = params.id as string;

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);

  const isLive =
    test?.status === "running" || test?.status === "pending";

  const {
    steps: liveSteps,
    test: completedTest,
    isConnected,
  } = useTestProgress(isLive ? testId : null);

  useEffect(() => {
    api
      .get<Test>(`/tests/${testId}`)
      .then(setTest)
      .catch((error) => {
        addToast({
          type: "error",
          message:
            error instanceof Error ? error.message : "Failed to load test",
        });
        router.push("/dashboard/tests");
      })
      .finally(() => setLoading(false));
  }, [testId, addToast, router]);

  // Update test when SSE completes
  useEffect(() => {
    if (completedTest) {
      setTest(completedTest);
    }
  }, [completedTest]);

  const handleRerun = async () => {
    setRerunning(true);
    try {
      const newTest = await api.post<Test>(`/tests/${testId}/rerun`);
      addToast({ type: "success", message: "Test restarted" });
      router.push(`/dashboard/tests/${newTest.id}`);
    } catch (error) {
      addToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to rerun test",
      });
    } finally {
      setRerunning(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/tests/${testId}`);
      addToast({ type: "success", message: "Test deleted" });
      router.push("/dashboard/tests");
    } catch (error) {
      addToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to delete test",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full rounded-card" />
          </div>
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      </div>
    );
  }

  if (!test) return null;

  const displaySteps = isLive && liveSteps.length > 0 ? liveSteps : test.steps || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/tests"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tests
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">
                {test.name}
              </h1>
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
              {isConnected && (
                <div className="flex items-center gap-1 text-xs text-success">
                  <Wifi className="h-3 w-3" />
                  Live
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-text-secondary">
              <span>{getEngineLabel(test.engine)}</span>
              <span className="text-text-tertiary">|</span>
              <a
                href={test.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-text-primary transition-colors"
              >
                {test.target_url}
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-text-tertiary">|</span>
              <span>{formatDate(test.created_at)}</span>
              {test.duration_ms != null && (
                <>
                  <span className="text-text-tertiary">|</span>
                  <span>{formatDuration(test.duration_ms)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRerun}
              isLoading={rerunning}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Rerun
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Test Steps
              </h2>
              {isLive && (
                <div className="flex items-center gap-2 text-sm text-info">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </div>
              )}
            </div>
            <StepTimeline steps={displaySteps} />
          </Card>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-6">
          <ResultSummary test={test} />

          {/* Instructions */}
          {test.instructions && (
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                Instructions
              </h3>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">
                {test.instructions}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

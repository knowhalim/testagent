"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getAccessToken } from "@/lib/api";
import type { Test, TestStep } from "@/lib/types";

interface UseTestProgressReturn {
  steps: TestStep[];
  test: Test | null;
  isConnected: boolean;
  error: string | null;
}

export function useTestProgress(testId: string | null): UseTestProgressReturn {
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [test, setTest] = useState<Test | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!testId) return;

    const token = getAccessToken();
    const url = `/api/tests/${testId}/stream${token ? `?token=${token}` : ""}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.addEventListener("step_update", (event) => {
      try {
        const data = JSON.parse(event.data);
        const step = data.step as TestStep;
        setSteps((prev) => {
          const idx = prev.findIndex((s) => s.id === step.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = step;
            return next;
          }
          return [...prev, step];
        });
      } catch {
        // ignore parse errors
      }
    });

    eventSource.addEventListener("test_complete", (event) => {
      try {
        const data = JSON.parse(event.data);
        setTest(data.test as Test);
      } catch {
        // ignore parse errors
      }
      eventSource.close();
      setIsConnected(false);
    });

    eventSource.addEventListener("error_event", (event) => {
      try {
        const data = JSON.parse(event.data);
        setError(data.message || "An error occurred");
      } catch {
        // ignore parse errors
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };
  }, [testId]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return { steps, test, isConnected, error };
}

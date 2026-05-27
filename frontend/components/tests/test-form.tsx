"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { EngineSelector } from "./engine-selector";
import { api } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import type { Test } from "@/lib/types";
import { z } from "zod";
import { Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";

const testSchema = z.object({
  name: z.string().min(1, "Test name is required").max(200),
  target_url: z.string().url("Please enter a valid URL"),
  engine: z.enum(["uat", "ui_audit", "ux_audit"]),
  instructions: z.string().max(5000).optional(),
});

export function TestForm() {
  const router = useRouter();
  const { addToast } = useToast();

  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [engine, setEngine] = useState<"uat" | "ui_audit" | "ux_audit">("uat");
  const [instructions, setInstructions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [runImmediately, setRunImmediately] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = testSchema.safeParse({
      name,
      target_url: targetUrl,
      engine,
      instructions: instructions || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      let fileUrl: string | undefined;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResult = await api.upload<{ url: string }>(
          "/tests/upload",
          formData
        );
        fileUrl = uploadResult.url;
      }

      const test = await api.post<Test>("/tests", {
        name,
        target_url: targetUrl,
        engine,
        instructions: instructions || undefined,
        file_url: fileUrl,
        run_immediately: runImmediately,
      });

      addToast({
        type: "success",
        message: runImmediately
          ? "Test started!"
          : "Test created successfully!",
      });
      router.push(`/dashboard/tests/${test.id}`);
    } catch (error) {
      addToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to create test",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Create New Test</h1>
        <p className="text-text-secondary mt-1">
          Configure and run a new test against your application.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Test Name"
            placeholder="e.g., Login Flow Validation"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />

          <Input
            label="Target URL"
            placeholder="https://example.com"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            type="url"
            error={errors.target_url}
          />

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Testing Engine
            </label>
            <EngineSelector value={engine} onChange={setEngine} />
          </div>

          <Textarea
            label="Test Instructions"
            placeholder={
              engine === "uat"
                ? "Describe the user journey to test... e.g., 'Navigate to the login page, enter invalid credentials, and verify that appropriate error messages are displayed.'"
                : engine === "ui_audit"
                ? "Describe what to audit... e.g., 'Check all form elements for consistent styling, verify color contrast meets WCAG AA, check responsive layout at mobile breakpoints.'"
                : "Describe the UX aspects to evaluate... e.g., 'Evaluate the checkout flow for friction points, assess form labels and error message clarity, review navigation discoverability.'"
            }
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            error={errors.instructions}
            hint="Plain English instructions for the AI test agent"
          />

          <FileUpload
            label="Reference File (optional)"
            hint="Upload screenshots, design specs, or test data — PNG, JPG, PDF, CSV, JSON (max 10MB)"
            accept=".png,.jpg,.jpeg,.pdf,.csv,.json"
            maxSizeMB={10}
            selectedFile={file}
            onFileSelect={setFile}
            onFileClear={() => setFile(null)}
          />

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={runImmediately}
                onChange={(e) => setRunImmediately(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-2 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
            <span className="text-sm text-text-primary">
              Run immediately after creation
            </span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              isLoading={loading}
              size="lg"
              leftIcon={<Zap className="h-4 w-4" />}
            >
              {runImmediately ? "Create & Run Test" : "Create Test"}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="ghost" size="lg">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

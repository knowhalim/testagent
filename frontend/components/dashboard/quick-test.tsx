"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { FileUpload } from "@/components/ui/file-upload";
import { api } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import type { Test } from "@/lib/types";
import { Zap, ClipboardCheck, Eye, Users } from "lucide-react";

const engineTabs = [
  { id: "uat", label: "UAT", icon: <ClipboardCheck className="h-4 w-4" /> },
  { id: "ui_audit", label: "UI Audit", icon: <Eye className="h-4 w-4" /> },
  { id: "ux_audit", label: "UX Audit", icon: <Users className="h-4 w-4" /> },
];

export function QuickTest() {
  const router = useRouter();
  const { addToast } = useToast();
  const [url, setUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [engine, setEngine] = useState("uat");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) {
      addToast({ type: "error", message: "Please enter a target URL" });
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
        name: `Quick test - ${new URL(url).hostname}`,
        target_url: url,
        engine,
        instructions: instructions || undefined,
        file_url: fileUrl,
        run_immediately: true,
      });

      addToast({ type: "success", message: "Test started!" });
      router.push(`/dashboard/tests/${test.id}`);
    } catch (error) {
      addToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to start test",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-card bg-primary/10 flex items-center justify-center">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <CardTitle>Quick Test</CardTitle>
          <p className="text-sm text-text-secondary">
            Run a test in seconds. Just paste a URL and go.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Input
          label="Target URL"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
        />

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Engine
          </label>
          <Tabs
            tabs={engineTabs}
            activeTab={engine}
            onTabChange={setEngine}
          />
        </div>

        <Textarea
          label="Instructions (optional)"
          placeholder="Describe what you want to test... e.g., 'Test the login flow with invalid credentials and verify error messages appear.'"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />

        <FileUpload
          label="Upload Reference (optional)"
          hint="Upload screenshots, specs, or test data (max 10MB)"
          accept=".png,.jpg,.jpeg,.pdf,.csv,.json"
          maxSizeMB={10}
          selectedFile={file}
          onFileSelect={setFile}
          onFileClear={() => setFile(null)}
        />

        <Button
          onClick={handleSubmit}
          isLoading={loading}
          className="w-full"
          size="lg"
          leftIcon={<Zap className="h-4 w-4" />}
        >
          Test Now
        </Button>
      </div>
    </Card>
  );
}

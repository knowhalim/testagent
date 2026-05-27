"use client";

import React, { useState, useEffect } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Tabs } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import type { Setting } from "@/lib/types";
import { Save } from "lucide-react";

const llmModes = [
  { id: "best", label: "Best Accuracy" },
  { id: "balanced", label: "Balanced" },
  { id: "fast", label: "Fast (Ollama)" },
];

export function SettingsGeneral() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [defaultLlmMode, setDefaultLlmMode] = useState("best");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  useEffect(() => {
    api
      .get<Setting[]>("/admin/settings")
      .then((settings) => {
        const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
        setSiteName(settingsMap.get("site_name") || "TestAgent");
        setSiteDescription(settingsMap.get("site_description") || "");
        setDefaultLlmMode(settingsMap.get("default_llm_mode") || "best");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        await api.upload("/tests/upload", formData);
      }
      if (faviconFile) {
        const formData = new FormData();
        formData.append("file", faviconFile);
        await api.upload("/tests/upload", formData);
      }

      await api.put("/admin/settings", {
        settings: {
          site_name: siteName,
          site_description: siteDescription,
          default_llm_mode: defaultLlmMode,
        },
      });

      addToast({ type: "success", message: "Settings saved successfully" });
    } catch (error) {
      addToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 animate-pulse space-y-4">
        <div className="h-4 w-32 bg-surface-2 rounded" />
        <div className="h-10 bg-surface-2 rounded" />
        <div className="h-10 bg-surface-2 rounded" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <CardTitle>General Settings</CardTitle>
        <CardDescription className="mt-1">
          Configure your TestAgent instance
        </CardDescription>
      </div>

      <div className="space-y-6">
        <Input
          label="Site Name"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          placeholder="TestAgent"
        />

        <Textarea
          label="Site Description"
          value={siteDescription}
          onChange={(e) => setSiteDescription(e.target.value)}
          placeholder="AI-powered testing platform"
          className="min-h-[80px]"
        />

        <FileUpload
          label="Logo"
          hint="PNG or SVG, recommended 200x50px"
          accept=".png,.svg"
          maxSizeMB={2}
          selectedFile={logoFile}
          onFileSelect={setLogoFile}
          onFileClear={() => setLogoFile(null)}
        />

        <FileUpload
          label="Favicon"
          hint="ICO or PNG, recommended 32x32px"
          accept=".ico,.png"
          maxSizeMB={1}
          selectedFile={faviconFile}
          onFileSelect={setFaviconFile}
          onFileClear={() => setFaviconFile(null)}
        />

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Default LLM Mode
          </label>
          <Tabs
            tabs={llmModes}
            activeTab={defaultLlmMode}
            onTabChange={setDefaultLlmMode}
          />
          <p className="mt-2 text-xs text-text-tertiary">
            Choose the default AI mode for new tests. Users can override per test.
          </p>
        </div>

        <div className="pt-4 border-t border-border-subtle">
          <Button
            onClick={handleSave}
            isLoading={saving}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </Card>
  );
}

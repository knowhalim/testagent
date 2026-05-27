"use client";

import React, { useState, useEffect } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import type { Setting } from "@/lib/types";
import { Save, Zap, Eye, EyeOff } from "lucide-react";

export function SettingsAPIKeys() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);

  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [ollamaModel, setOllamaModel] = useState("");

  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  useEffect(() => {
    api
      .get<Setting[]>("/admin/settings")
      .then((settings) => {
        const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
        setOpenaiKey(settingsMap.get("openai_api_key") || "");
        setAnthropicKey(settingsMap.get("anthropic_api_key") || "");
        setOllamaUrl(settingsMap.get("ollama_url") || "http://localhost:11434");
        setOllamaModel(settingsMap.get("ollama_model") || "llama3.2");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        settings: {
          openai_api_key: openaiKey,
          anthropic_api_key: anthropicKey,
          ollama_url: ollamaUrl,
          ollama_model: ollamaModel,
        },
      });
      addToast({ type: "success", message: "API keys saved" });
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

  const handleTestConnection = async () => {
    setTestingLlm(true);
    try {
      await api.post("/admin/settings/test-llm");
      addToast({ type: "success", message: "LLM connection successful!" });
    } catch (error) {
      addToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "LLM connection test failed",
      });
    } finally {
      setTestingLlm(false);
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
        <CardTitle>API Keys</CardTitle>
        <CardDescription className="mt-1">
          Configure AI provider API keys for test execution
        </CardDescription>
      </div>

      <div className="space-y-8">
        {/* OpenAI */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-text-primary">OpenAI</h4>
            {openaiKey && (
              <Badge variant="success">Configured</Badge>
            )}
          </div>
          <Input
            label="API Key"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            type={showOpenai ? "text" : "password"}
            placeholder="sk-..."
            rightIcon={
              <button
                type="button"
                onClick={() => setShowOpenai(!showOpenai)}
                className="text-text-tertiary hover:text-text-primary"
              >
                {showOpenai ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />
        </div>

        {/* Anthropic */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-text-primary">
              Anthropic
            </h4>
            {anthropicKey && (
              <Badge variant="success">Configured</Badge>
            )}
          </div>
          <Input
            label="API Key"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            type={showAnthropic ? "text" : "password"}
            placeholder="sk-ant-..."
            rightIcon={
              <button
                type="button"
                onClick={() => setShowAnthropic(!showAnthropic)}
                className="text-text-tertiary hover:text-text-primary"
              >
                {showAnthropic ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />
        </div>

        {/* Ollama */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-text-primary">
            Ollama (Local)
          </h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Ollama URL"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
            <Input
              label="Model Name"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder="llama3.2"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border-subtle flex flex-wrap items-center gap-3">
          <Button
            onClick={handleSave}
            isLoading={saving}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save API Keys
          </Button>
          <Button
            variant="secondary"
            onClick={handleTestConnection}
            isLoading={testingLlm}
            leftIcon={<Zap className="h-4 w-4" />}
          >
            Test Connection
          </Button>
        </div>
      </div>
    </Card>
  );
}

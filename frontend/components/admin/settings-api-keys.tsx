"use client";

import React, { useState, useEffect } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import type { Setting } from "@/lib/types";
import { Save, Zap, Eye, EyeOff, Check } from "lucide-react";

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
];

const ANTHROPIC_MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-haiku-4-20250414", label: "Claude Haiku 4" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
];

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "ollama", label: "Ollama (Local)" },
];

export function SettingsAPIKeys() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);

  const [activeProvider, setActiveProvider] = useState("openai");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("claude-sonnet-4-20250514");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");

  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  useEffect(() => {
    api
      .get<{ settings: Record<string, string> } | Setting[]>("/admin/settings")
      .then((data) => {
        const s: Record<string, string> = Array.isArray(data)
          ? Object.fromEntries(data.map((i) => [i.key, i.value]))
          : (data as { settings: Record<string, string> }).settings || {};
        setActiveProvider(s.default_llm_provider || "openai");
        setOpenaiKey(s.openai_api_key || "");
        setOpenaiModel(s.openai_model || "gpt-4o");
        setAnthropicKey(s.anthropic_api_key || "");
        setAnthropicModel(s.anthropic_model || "claude-sonnet-4-20250514");
        setOllamaUrl(s.ollama_base_url || s.ollama_url || "http://localhost:11434");
        setOllamaModel(s.ollama_model || "llama3.2");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        settings: {
          default_llm_provider: activeProvider,
          openai_api_key: openaiKey,
          openai_model: openaiModel,
          anthropic_api_key: anthropicKey,
          anthropic_model: anthropicModel,
          ollama_base_url: ollamaUrl,
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
      await api.post(`/admin/settings/test-llm?provider=${activeProvider}`);
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
        {/* Active Provider Selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-text-secondary">
            Active AI Provider
          </label>
          <div className="grid grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setActiveProvider(p.value)}
                className={`relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  activeProvider === p.value
                    ? "border-primary bg-primary/10 text-primary shadow-glow-primary/20"
                    : "border-border-subtle bg-surface-1 text-text-secondary hover:border-border-default hover:text-text-primary"
                }`}
              >
                {activeProvider === p.value && (
                  <Check className="h-4 w-4" />
                )}
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-tertiary">
            Tests will use the selected provider by default
          </p>
        </div>

        {/* OpenAI */}
        <div className={`space-y-4 p-4 rounded-xl border transition-all ${
          activeProvider === "openai"
            ? "border-primary/30 bg-primary/5"
            : "border-border-subtle bg-surface-1/50"
        }`}>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-text-primary">OpenAI</h4>
            {activeProvider === "openai" && (
              <Badge variant="primary">Active</Badge>
            )}
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
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Model
            </label>
            <select
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-surface-1 border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              {OPENAI_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Anthropic */}
        <div className={`space-y-4 p-4 rounded-xl border transition-all ${
          activeProvider === "anthropic"
            ? "border-primary/30 bg-primary/5"
            : "border-border-subtle bg-surface-1/50"
        }`}>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-text-primary">Anthropic</h4>
            {activeProvider === "anthropic" && (
              <Badge variant="primary">Active</Badge>
            )}
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
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Model
            </label>
            <select
              value={anthropicModel}
              onChange={(e) => setAnthropicModel(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-surface-1 border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              {ANTHROPIC_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ollama */}
        <div className={`space-y-4 p-4 rounded-xl border transition-all ${
          activeProvider === "ollama"
            ? "border-primary/30 bg-primary/5"
            : "border-border-subtle bg-surface-1/50"
        }`}>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-text-primary">Ollama (Local)</h4>
            {activeProvider === "ollama" && (
              <Badge variant="primary">Active</Badge>
            )}
          </div>
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

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import type { Setting } from "@/lib/types";
import { Save, Eye } from "lucide-react";

export function SettingsAppearance() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#0A2FFF");
  const [accentColor, setAccentColor] = useState("#00F0D4");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [customCss, setCustomCss] = useState("");

  useEffect(() => {
    api
      .get<Setting[]>("/admin/settings")
      .then((settings) => {
        const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
        setPrimaryColor(settingsMap.get("primary_color") || "#0A2FFF");
        setAccentColor(settingsMap.get("accent_color") || "#00F0D4");
        setFontFamily(settingsMap.get("font_family") || "Inter");
        setCustomCss(settingsMap.get("custom_css") || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        settings: {
          primary_color: primaryColor,
          accent_color: accentColor,
          font_family: fontFamily,
          custom_css: customCss,
        },
      });
      addToast({ type: "success", message: "Appearance settings saved" });
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

  const handlePreview = () => {
    document.documentElement.style.setProperty("--color-primary", primaryColor);
    document.documentElement.style.setProperty("--color-accent", accentColor);
    addToast({ type: "info", message: "Preview applied (not saved)" });
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
        <CardTitle>Appearance</CardTitle>
        <CardDescription className="mt-1">
          Customize the look and feel of your TestAgent instance
        </CardDescription>
      </div>

      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 rounded-button border border-border-subtle cursor-pointer bg-transparent"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#0A2FFF"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-10 rounded-button border border-border-subtle cursor-pointer bg-transparent"
              />
              <Input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#00F0D4"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <Input
          label="Font Family"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          placeholder="Inter"
          hint="Enter a Google Fonts name or system font"
        />

        <Textarea
          label="Custom CSS"
          value={customCss}
          onChange={(e) => setCustomCss(e.target.value)}
          placeholder={`:root {\n  /* Override any CSS variable here */\n}`}
          className="font-mono text-sm min-h-[200px]"
          hint="Advanced: Add custom CSS that will be injected globally"
        />

        {/* Live preview */}
        <div className="p-4 bg-surface-2 rounded-card border border-border-subtle">
          <p className="text-xs text-text-tertiary mb-3">Preview</p>
          <div className="flex items-center gap-3">
            <div
              className="w-16 h-10 rounded-button flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: primaryColor }}
            >
              Button
            </div>
            <div
              className="w-16 h-10 rounded-button flex items-center justify-center text-ground text-sm font-medium"
              style={{ backgroundColor: accentColor }}
            >
              Accent
            </div>
            <div className="flex-1 h-2 rounded-full bg-surface-1 overflow-hidden">
              <div
                className="h-full w-3/4 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border-subtle flex items-center gap-3">
          <Button
            onClick={handleSave}
            isLoading={saving}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Appearance
          </Button>
          <Button
            variant="secondary"
            onClick={handlePreview}
            leftIcon={<Eye className="h-4 w-4" />}
          >
            Preview
          </Button>
        </div>
      </div>
    </Card>
  );
}

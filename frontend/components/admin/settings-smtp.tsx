"use client";

import React, { useState, useEffect } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import type { Setting } from "@/lib/types";
import { Save, Send } from "lucide-react";

export function SettingsSMTP() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [encryption, setEncryption] = useState("tls");
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    api
      .get<Setting[]>("/admin/settings")
      .then((settings) => {
        const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
        setHost(settingsMap.get("smtp_host") || "");
        setPort(settingsMap.get("smtp_port") || "587");
        setUsername(settingsMap.get("smtp_username") || "");
        setPassword(settingsMap.get("smtp_password") || "");
        setFromEmail(settingsMap.get("smtp_from_email") || "");
        setFromName(settingsMap.get("smtp_from_name") || "");
        setEncryption(settingsMap.get("smtp_encryption") || "tls");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        settings: {
          smtp_host: host,
          smtp_port: port,
          smtp_username: username,
          smtp_password: password,
          smtp_from_email: fromEmail,
          smtp_from_name: fromName,
          smtp_encryption: encryption,
        },
      });
      addToast({ type: "success", message: "SMTP settings saved" });
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

  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      addToast({ type: "error", message: "Please enter a test email address" });
      return;
    }
    setTesting(true);
    try {
      await api.post("/admin/settings/test-smtp", { email: testEmail });
      addToast({ type: "success", message: "Test email sent successfully" });
    } catch (error) {
      addToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to send test email",
      });
    } finally {
      setTesting(false);
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
        <CardTitle>SMTP Settings</CardTitle>
        <CardDescription className="mt-1">
          Configure email delivery for notifications
        </CardDescription>
      </div>

      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <Input
            label="SMTP Host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="smtp.gmail.com"
          />
          <Input
            label="SMTP Port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="587"
            type="number"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your@email.com"
          />
          <Input
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="App password"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <Input
            label="From Email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="noreply@yourdomain.com"
            type="email"
          />
          <Input
            label="From Name"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="TestAgent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Encryption
          </label>
          <div className="flex items-center gap-4">
            {["tls", "ssl", "none"].map((enc) => (
              <label key={enc} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="encryption"
                  value={enc}
                  checked={encryption === enc}
                  onChange={() => setEncryption(enc)}
                  className="text-primary focus:ring-primary bg-surface-1 border-border-subtle"
                />
                <span className="text-sm text-text-primary uppercase">
                  {enc}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-border-subtle">
          <Button
            onClick={handleSave}
            isLoading={saving}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save SMTP Settings
          </Button>
        </div>

        {/* Test email */}
        <div className="pt-4 border-t border-border-subtle">
          <h4 className="text-sm font-medium text-text-primary mb-3">
            Send Test Email
          </h4>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                type="email"
              />
            </div>
            <Button
              variant="secondary"
              onClick={handleTestEmail}
              isLoading={testing}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Send Test
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

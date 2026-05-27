"use client";

import React, { useState } from "react";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { SettingsGeneral } from "@/components/admin/settings-general";
import { SettingsAppearance } from "@/components/admin/settings-appearance";
import { SettingsSMTP } from "@/components/admin/settings-smtp";
import { SettingsAPIKeys } from "@/components/admin/settings-api-keys";
import { SettingsUsers } from "@/components/admin/settings-users";
import { SettingsLogs } from "@/components/admin/settings-logs";
import { SettingsMCP } from "@/components/admin/settings-mcp";
import {
  Settings,
  Palette,
  Mail,
  Key,
  Users,
  ScrollText,
  Server,
} from "lucide-react";

const settingsTabs = [
  { id: "general", label: "General", icon: <Settings className="h-4 w-4" /> },
  {
    id: "appearance",
    label: "Appearance",
    icon: <Palette className="h-4 w-4" />,
  },
  { id: "smtp", label: "SMTP", icon: <Mail className="h-4 w-4" /> },
  { id: "api-keys", label: "API Keys", icon: <Key className="h-4 w-4" /> },
  { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { id: "logs", label: "Logs", icon: <ScrollText className="h-4 w-4" /> },
  {
    id: "mcp",
    label: "MCP Server",
    icon: <Server className="h-4 w-4" />,
  },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Admin Settings
        </h1>
        <p className="text-text-secondary mt-1">
          Configure your TestAgent instance
        </p>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <Tabs
          tabs={settingsTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <TabPanel id="general" activeTab={activeTab}>
        <SettingsGeneral />
      </TabPanel>
      <TabPanel id="appearance" activeTab={activeTab}>
        <SettingsAppearance />
      </TabPanel>
      <TabPanel id="smtp" activeTab={activeTab}>
        <SettingsSMTP />
      </TabPanel>
      <TabPanel id="api-keys" activeTab={activeTab}>
        <SettingsAPIKeys />
      </TabPanel>
      <TabPanel id="users" activeTab={activeTab}>
        <SettingsUsers />
      </TabPanel>
      <TabPanel id="logs" activeTab={activeTab}>
        <SettingsLogs />
      </TabPanel>
      <TabPanel id="mcp" activeTab={activeTab}>
        <SettingsMCP />
      </TabPanel>
    </div>
  );
}

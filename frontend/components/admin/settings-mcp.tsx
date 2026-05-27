"use client";

import React, { useState, useEffect } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import type { MCPToken, MCPConfig } from "@/lib/types";
import { Plus, Trash2, Copy, Server } from "lucide-react";

const configTabs = [
  { id: "claude-desktop", label: "Claude Desktop" },
  { id: "claude-code", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
];

export function SettingsMCP() {
  const { addToast } = useToast();
  const [tokens, setTokens] = useState<MCPToken[]>([]);
  const [config, setConfig] = useState<MCPConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [configTab, setConfigTab] = useState("claude-desktop");

  const fetchData = async () => {
    try {
      const [tokensData, configData] = await Promise.all([
        api.get<MCPToken[]>("/mcp/tokens"),
        api.get<MCPConfig>("/mcp/config"),
      ]);
      setTokens(tokensData);
      setConfig(configData);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateToken = async () => {
    if (!tokenName.trim()) {
      addToast({ type: "error", message: "Please enter a token name" });
      return;
    }
    setCreating(true);
    try {
      const token = await api.post<MCPToken>("/mcp/tokens", {
        name: tokenName,
      });
      setNewToken(token.token);
      setTokenName("");
      fetchData();
    } catch (error) {
      addToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to create token",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteToken = async (id: string) => {
    try {
      await api.delete(`/mcp/tokens/${id}`);
      addToast({ type: "success", message: "Token deleted" });
      fetchData();
    } catch (error) {
      addToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to delete token",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({ type: "success", message: "Copied to clipboard" });
  };

  const getConfigJson = (platform: string) => {
    if (!config) return "{}";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

    if (platform === "claude-desktop") {
      return JSON.stringify(
        {
          mcpServers: {
            testagent: {
              url: `${baseUrl}/mcp/sse`,
              transport: "sse",
            },
          },
        },
        null,
        2
      );
    }

    if (platform === "claude-code") {
      return JSON.stringify(
        {
          mcpServers: {
            testagent: {
              url: `${baseUrl}/mcp/sse`,
              transport: "sse",
            },
          },
        },
        null,
        2
      );
    }

    // Cursor
    return JSON.stringify(
      {
        mcpServers: {
          testagent: {
            url: `${baseUrl}/mcp/sse`,
            transport: "sse",
          },
        },
      },
      null,
      2
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-accent/10 flex items-center justify-center">
                <Server className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle>MCP Server</CardTitle>
                <CardDescription className="mt-0.5">
                  Model Context Protocol server for AI agent integration
                </CardDescription>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          {config && (
            <div className="mt-4 p-3 bg-surface-2 rounded-button font-mono text-sm text-text-secondary">
              <span className="text-text-tertiary">Endpoint: </span>
              {config.endpoint}
              <span className="ml-4 text-text-tertiary">Transport: </span>
              {config.transport}
            </div>
          )}
        </Card>

        {/* Tokens */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <CardTitle>API Tokens</CardTitle>
              <CardDescription className="mt-1">
                Tokens for authenticating MCP connections
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setNewToken(null);
                setCreateModalOpen(true);
              }}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Token
            </Button>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-surface-2 rounded-button" />
              ))}
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-secondary">No tokens created yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Last Used
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>
                      <span className="font-medium">{token.name}</span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs text-text-tertiary font-mono">
                        {token.token.substring(0, 12)}...
                      </code>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-text-secondary">
                        {formatDate(token.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-text-secondary">
                        {token.last_used_at
                          ? formatDate(token.last_used_at)
                          : "Never"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(token.token)}
                          className="p-2 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                          aria-label="Copy token"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteToken(token.id)}
                          className="p-2 rounded-button text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                          aria-label="Delete token"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Config generators */}
        <Card className="p-6">
          <div className="mb-6">
            <CardTitle>Configuration</CardTitle>
            <CardDescription className="mt-1">
              Copy the configuration for your preferred AI tool
            </CardDescription>
          </div>

          <Tabs
            tabs={configTabs}
            activeTab={configTab}
            onTabChange={setConfigTab}
            className="mb-4"
          />

          {configTabs.map((tab) => (
            <TabPanel key={tab.id} id={tab.id} activeTab={configTab}>
              <div className="relative">
                <pre className="p-4 bg-surface-2 rounded-card text-sm font-mono text-text-secondary overflow-x-auto">
                  {getConfigJson(tab.id)}
                </pre>
                <button
                  onClick={() => copyToClipboard(getConfigJson(tab.id))}
                  className="absolute top-3 right-3 p-2 rounded-button bg-surface-1 text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
                  aria-label="Copy configuration"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </TabPanel>
          ))}
        </Card>
      </div>

      {/* Create token modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={newToken ? "Token Created" : "Create Token"}
        size="sm"
      >
        {newToken ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Copy this token now. You will not be able to see it again.
            </p>
            <div className="flex items-center gap-2 p-3 bg-surface-2 rounded-button">
              <code className="text-sm font-mono text-accent flex-1 break-all">
                {newToken}
              </code>
              <button
                onClick={() => copyToClipboard(newToken)}
                className="p-2 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-1 transition-colors shrink-0"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <Button
              className="w-full"
              onClick={() => setCreateModalOpen(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Token Name"
              placeholder="e.g., Claude Desktop"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <Button onClick={handleCreateToken} isLoading={creating}>
                Create Token
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

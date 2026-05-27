import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeDate(dateString: string | null | undefined): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms && ms !== 0) return "--";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatCost(cost: number | null | undefined): string {
  if (!cost && cost !== 0) return "--";
  if (cost < 0.01) return "<$0.01";
  return `$${cost.toFixed(2)}`;
}

export function formatPassRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "0%";
  return `${Math.round(rate)}%`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "passed":
      return "success";
    case "failed":
      return "danger";
    case "running":
      return "info";
    case "pending":
      return "warning";
    case "cancelled":
    case "skipped":
      return "default";
    default:
      return "default";
  }
}

export function getEngineLabel(engine: string): string {
  switch (engine) {
    case "uat":
      return "UAT Testing";
    case "ui_audit":
      return "UI Audit";
    case "ux_audit":
      return "UX Audit";
    default:
      return engine;
  }
}

export function getEngineDescription(engine: string): string {
  switch (engine) {
    case "uat":
      return "Automated User Acceptance Testing with AI-driven interactions";
    case "ui_audit":
      return "Visual consistency, accessibility, and design compliance checks";
    case "ux_audit":
      return "User experience analysis including flows, clarity, and usability";
    default:
      return "";
  }
}

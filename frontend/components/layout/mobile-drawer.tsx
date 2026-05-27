"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";
import { X, Settings, LogOut, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navLinks: NavLink[];
  user: User | null;
  isAdmin: boolean;
  onLogout: () => void;
}

export function MobileDrawer({
  isOpen,
  onClose,
  navLinks,
  user,
  isAdmin,
  onLogout,
}: MobileDrawerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-ground/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[calc(100%-3rem)] bg-surface-1 border-l border-border-subtle animate-slide-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-text-primary">
                TestAgent
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors min-h-touch min-w-touch flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-text-tertiary">
                  {user?.email || ""}
                </p>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 p-4 space-y-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/dashboard" && pathname.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium",
                    "transition-colors duration-200 min-h-touch",
                    isActive
                      ? "text-text-primary bg-primary/10 text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin/settings"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium",
                  "transition-colors duration-200 min-h-touch",
                  pathname.startsWith("/admin")
                    ? "text-primary bg-primary/10"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                )}
              >
                <Settings className="h-5 w-5" />
                Admin Settings
              </Link>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border-subtle">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-button text-sm font-medium text-danger hover:bg-danger/10 transition-colors min-h-touch"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

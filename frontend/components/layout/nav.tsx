"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Dropdown } from "@/components/ui/dropdown";
import { MobileDrawer } from "./mobile-drawer";
import {
  LayoutDashboard,
  Plus,
  History,
  Settings,
  LogOut,
  User,
  Menu,
  Zap,
} from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tests/new", label: "New Test", icon: Plus },
  { href: "/dashboard/tests", label: "History", icon: History },
];

export function Nav() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const userMenuItems = [
    {
      id: "profile",
      label: user?.name || "Profile",
      icon: <User className="h-4 w-4" />,
    },
    ...(isAdmin
      ? [
          {
            id: "admin",
            label: "Admin Settings",
            icon: <Settings className="h-4 w-4" />,
            onClick: () => {
              window.location.href = "/admin/settings";
            },
          },
        ]
      : []),
    { id: "divider", label: "", divider: true as const },
    {
      id: "logout",
      label: "Sign Out",
      icon: <LogOut className="h-4 w-4" />,
      onClick: logout,
      variant: "danger" as const,
    },
  ];

  return (
    <>
      <nav
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300",
          scrolled
            ? "glass-nav border-b border-border-subtle"
            : "bg-transparent"
        )}
      >
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:shadow-glow transition-shadow">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-text-primary">
                TestAgent
              </span>
            </Link>

            {/* Center nav links — desktop */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/dashboard" &&
                    pathname.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2 rounded-button text-sm font-medium",
                      "transition-colors duration-200 min-h-touch",
                      isActive
                        ? "text-text-primary bg-surface-2"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-2/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Avatar dropdown — desktop */}
              <div className="hidden md:block">
                <Dropdown
                  trigger={
                    <button
                      className="flex items-center gap-2 p-1.5 rounded-button hover:bg-surface-2 transition-colors min-h-touch"
                      aria-label="User menu"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    </button>
                  }
                  items={userMenuItems}
                />
              </div>

              {/* Hamburger — mobile */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden p-2 rounded-button text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors min-h-touch min-w-touch flex items-center justify-center"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navLinks={navLinks}
        user={user}
        isAdmin={isAdmin}
        onLogout={logout}
      />
    </>
  );
}

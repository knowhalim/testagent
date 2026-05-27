"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "accent"
  | "outline"
  | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover hover:shadow-glow active:bg-primary focus-visible:ring-primary",
  secondary:
    "bg-surface-2 text-text-primary border border-border-subtle hover:bg-surface-raised hover:border-border-default active:bg-surface-1",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary active:bg-surface-1",
  accent:
    "bg-accent text-ground hover:bg-accent-hover hover:shadow-glow-accent active:opacity-90 font-semibold",
  outline:
    "bg-transparent text-text-primary border border-border-default hover:bg-surface-2 hover:border-text-tertiary active:bg-surface-1",
  danger:
    "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 hover:border-danger/40 active:bg-danger/30",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2 min-h-touch",
  lg: "h-12 px-7 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-button transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ground",
          "disabled:opacity-50 disabled:pointer-events-none",
          "select-none whitespace-nowrap",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

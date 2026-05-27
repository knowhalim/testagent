import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

export function Hero() {
  return (
    <section className="relative gradient-hero overflow-hidden">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-section-mobile md:py-section-tablet lg:py-section-desktop">
        <div className="text-center max-w-3xl mx-auto">
          {/* Tag line */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-slow" />
            <span className="text-sm text-primary font-medium">
              Self-hosted AI testing platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary leading-tight">
            AI-Powered Testing.{" "}
            <span className="gradient-text">Zero Code.</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Run UAT, UI audits, and UX audits with a single prompt. TestAgent
            uses AI to understand your app and validate it like a real user would.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Get Started
              </Button>
            </Link>
            <Link href="/#how-it-works">
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Play className="h-4 w-4" />}
              >
                View Demo
              </Button>
            </Link>
          </div>

          {/* Trust line */}
          <p className="mt-8 text-sm text-text-tertiary">
            Free and open-source. Self-host on your own infrastructure.
          </p>
        </div>
      </div>

      {/* Decorative gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
    </section>
  );
}

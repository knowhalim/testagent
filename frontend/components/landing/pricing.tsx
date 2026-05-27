import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown } from "lucide-react";

const plans = [
  {
    name: "Free Mode",
    price: "$0",
    period: "forever",
    description: "Use your own API keys. Self-host on your infrastructure.",
    icon: Zap,
    iconColor: "text-primary",
    features: [
      "Unlimited tests",
      "All three engines (UAT, UI, UX)",
      "Bring your own OpenAI/Anthropic key",
      "Local Ollama support",
      "MCP server integration",
      "Full admin dashboard",
      "Docker deployment",
    ],
    cta: "Get Started",
    ctaVariant: "secondary" as const,
    highlight: false,
  },
  {
    name: "Best Accuracy",
    price: "Your API costs",
    period: "pay-as-you-go",
    description: "Premium AI models for the highest accuracy and best results.",
    icon: Crown,
    iconColor: "text-accent",
    features: [
      "Everything in Free Mode",
      "Claude 3.5 Sonnet / GPT-4o",
      "Higher accuracy results",
      "Better visual analysis",
      "More nuanced UX feedback",
      "Faster test execution",
      "Priority model routing",
    ],
    cta: "Get Started",
    ctaVariant: "primary" as const,
    highlight: true,
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="py-section-mobile md:py-section-tablet lg:py-section-desktop"
    >
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            TestAgent is free and open-source. You only pay for the AI model API
            costs you choose to use.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.name}
                className={`p-6 md:p-8 relative ${
                  plan.highlight
                    ? "border-primary/40 bg-surface-1"
                    : ""
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full text-xs font-medium text-white">
                    Recommended
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-card ${
                      plan.highlight ? "bg-accent/10" : "bg-primary/10"
                    } flex items-center justify-center`}
                  >
                    <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {plan.name}
                  </h3>
                </div>

                <div className="mb-2">
                  <span className="text-3xl font-bold text-text-primary">
                    {plan.price}
                  </span>
                  <span className="text-sm text-text-tertiary ml-2">
                    / {plan.period}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mb-6">
                  {plan.description}
                </p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span className="text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/register" className="block">
                  <Button variant={plan.ctaVariant} className="w-full">
                    {plan.cta}
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

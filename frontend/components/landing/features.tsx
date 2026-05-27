import React from "react";
import { Card } from "@/components/ui/card";
import { ClipboardCheck, Eye, Users } from "lucide-react";

const features = [
  {
    icon: ClipboardCheck,
    title: "UAT Testing",
    description:
      "Describe your test scenario in plain English. TestAgent navigates your app, fills forms, clicks buttons, and validates outcomes — just like a human tester.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Eye,
    title: "UI Audit",
    description:
      "Automatically detect visual inconsistencies, broken layouts, accessibility violations, and design system deviations across every page of your application.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Users,
    title: "UX Audit",
    description:
      "Get AI-powered analysis of user flows, navigation clarity, form usability, error handling, and overall user experience quality with actionable recommendations.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

export function Features() {
  return (
    <section id="features" className="py-section-mobile md:py-section-tablet lg:py-section-desktop">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Three engines. One platform.
          </h2>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            Choose the right testing approach for your needs, or combine them all
            for comprehensive coverage.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} hover className="p-6 md:p-8">
                <div
                  className={`w-12 h-12 rounded-card ${feature.bgColor} flex items-center justify-center mb-5`}
                >
                  <Icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">
                  {feature.title}
                </h3>
                <p className="text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import React from "react";

const steps = [
  {
    number: "01",
    title: "Describe your test",
    description:
      "Enter a URL and describe what you want to test in plain English. Upload screenshots or specs for more context. Select your testing engine.",
  },
  {
    number: "02",
    title: "AI runs the test",
    description:
      "TestAgent launches a real browser, navigates your app, and performs the test actions. Watch each step execute in real-time with live screenshots.",
  },
  {
    number: "03",
    title: "Review results",
    description:
      "Get a detailed timeline of every action taken, screenshots at each step, pass/fail status, and actionable recommendations to improve your app.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-section-mobile md:py-section-tablet lg:py-section-desktop bg-surface-1"
    >
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
            How it works
          </h2>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            From prompt to results in under a minute. No test scripts, no
            configuration files, no learning curve.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(100%+0.5rem)] w-[calc(100%-1rem)] h-px bg-border-subtle" />
              )}

              <div className="text-5xl font-bold text-primary/20 mb-4">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">
                {step.title}
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

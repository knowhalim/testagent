import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { EngineConfig, RunResponse, StepResult } from "../types.js";

/**
 * Collect accessibility-related data from a Playwright page.
 */
async function collectAccessibilityData(page: import("playwright").Page) {
  // Get the accessibility tree snapshot
  const accessibilityTree = await page.accessibility.snapshot();

  // Collect additional DOM-level accessibility info via page.evaluate
  const domAudit = await page.evaluate(() => {
    const issues: Array<{
      type: string;
      selector: string;
      detail: string;
    }> = [];

    // Check images without alt text
    document.querySelectorAll("img").forEach((img, i) => {
      if (!img.hasAttribute("alt")) {
        issues.push({
          type: "missing-alt",
          selector: `img:nth-of-type(${i + 1})`,
          detail: `Image missing alt attribute: src="${img.src?.slice(0, 100)}"`,
        });
      } else if (img.alt.trim() === "") {
        // Empty alt is valid for decorative images, but flag it
        issues.push({
          type: "empty-alt",
          selector: `img:nth-of-type(${i + 1})`,
          detail: `Image has empty alt (decorative?): src="${img.src?.slice(0, 100)}"`,
        });
      }
    });

    // Check form inputs without labels
    document
      .querySelectorAll("input, select, textarea")
      .forEach((input, i) => {
        const el = input as HTMLInputElement;
        const hasLabel =
          el.labels && el.labels.length > 0;
        const hasAriaLabel =
          el.hasAttribute("aria-label") ||
          el.hasAttribute("aria-labelledby");
        const hasTitle = el.hasAttribute("title");
        const hasPlaceholder = el.hasAttribute("placeholder");
        const isHidden =
          el.type === "hidden" ||
          el.hasAttribute("hidden") ||
          el.getAttribute("aria-hidden") === "true";

        if (!isHidden && !hasLabel && !hasAriaLabel && !hasTitle) {
          issues.push({
            type: "missing-label",
            selector: `${el.tagName.toLowerCase()}:nth-of-type(${i + 1})`,
            detail: `Form control missing label: type="${el.type}", name="${el.name}"${hasPlaceholder ? " (has placeholder but no label)" : ""}`,
          });
        }
      });

    // Check for missing lang attribute
    if (!document.documentElement.hasAttribute("lang")) {
      issues.push({
        type: "missing-lang",
        selector: "html",
        detail: "Document missing lang attribute on <html> element",
      });
    }

    // Check for missing page title
    if (!document.title || document.title.trim() === "") {
      issues.push({
        type: "missing-title",
        selector: "head > title",
        detail: "Page is missing a <title> element",
      });
    }

    // Check heading hierarchy
    const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    let prevLevel = 0;
    headings.forEach((h) => {
      const level = parseInt(h.tagName[1], 10);
      if (prevLevel > 0 && level > prevLevel + 1) {
        issues.push({
          type: "heading-skip",
          selector: h.tagName.toLowerCase(),
          detail: `Heading level skipped: went from h${prevLevel} to h${level} ("${h.textContent?.slice(0, 50)}")`,
        });
      }
      prevLevel = level;
    });

    // Check for buttons/links without accessible text
    document.querySelectorAll("button, a").forEach((el, i) => {
      const text = (el.textContent || "").trim();
      const ariaLabel = el.getAttribute("aria-label") || "";
      const ariaLabelledBy = el.getAttribute("aria-labelledby") || "";
      const title = el.getAttribute("title") || "";
      const hasImg = el.querySelector("img[alt]");
      const hasSvgTitle = el.querySelector("svg title");

      if (
        !text &&
        !ariaLabel &&
        !ariaLabelledBy &&
        !title &&
        !hasImg &&
        !hasSvgTitle
      ) {
        issues.push({
          type: "empty-interactive",
          selector: `${el.tagName.toLowerCase()}:nth-of-type(${i + 1})`,
          detail: `Interactive element (${el.tagName.toLowerCase()}) has no accessible name`,
        });
      }
    });

    // Check for missing ARIA landmarks
    const hasMain = !!document.querySelector("main, [role='main']");
    const hasNav = !!document.querySelector("nav, [role='navigation']");
    if (!hasMain) {
      issues.push({
        type: "missing-landmark",
        selector: "body",
        detail: "Page missing <main> landmark region",
      });
    }
    if (!hasNav) {
      issues.push({
        type: "missing-landmark",
        selector: "body",
        detail: "Page missing <nav> landmark region",
      });
    }

    // Check tab order — elements with positive tabindex
    document.querySelectorAll("[tabindex]").forEach((el) => {
      const tabIndex = parseInt(el.getAttribute("tabindex") || "0", 10);
      if (tabIndex > 0) {
        issues.push({
          type: "positive-tabindex",
          selector: el.tagName.toLowerCase(),
          detail: `Element has positive tabindex="${tabIndex}" which disrupts natural tab order`,
        });
      }
    });

    // Check color contrast via computed styles on text elements (basic check)
    // Full contrast checking requires image analysis, but we can flag suspicious cases
    const textElements = document.querySelectorAll(
      "p, span, a, button, label, h1, h2, h3, h4, h5, h6, li, td, th"
    );
    let lowContrastCount = 0;
    textElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bgColor = style.backgroundColor;
      // Flag if text color is very light on potentially light background
      if (
        color &&
        bgColor &&
        color === bgColor &&
        color !== "rgba(0, 0, 0, 0)"
      ) {
        lowContrastCount++;
      }
    });
    if (lowContrastCount > 0) {
      issues.push({
        type: "same-color-text-bg",
        selector: "various",
        detail: `Found ${lowContrastCount} element(s) where text color equals background color`,
      });
    }

    // Collect semantic structure summary
    const structure = {
      headingCount: headings.length,
      linkCount: document.querySelectorAll("a").length,
      buttonCount: document.querySelectorAll("button").length,
      formCount: document.querySelectorAll("form").length,
      inputCount: document.querySelectorAll("input, select, textarea").length,
      imageCount: document.querySelectorAll("img").length,
      landmarkCount: document.querySelectorAll(
        "main, nav, header, footer, aside, [role='main'], [role='navigation'], [role='banner'], [role='contentinfo'], [role='complementary']"
      ).length,
    };

    return { issues, structure };
  });

  // Collect all focusable elements in tab order
  const tabOrder = await page.evaluate(() => {
    const focusable = Array.from(
      document.querySelectorAll(
        'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
    return focusable.slice(0, 50).map((el, i) => ({
      index: i + 1,
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().slice(0, 60),
      role: el.getAttribute("role") || "",
      tabindex: el.getAttribute("tabindex") || "",
    }));
  });

  return { accessibilityTree, domAudit, tabOrder };
}

/**
 * Send accessibility data to an LLM for expert analysis.
 */
async function callLlmForUxAnalysis(
  config: EngineConfig,
  axTree: unknown,
  domAudit: { issues: Array<{ type: string; selector: string; detail: string }>; structure: Record<string, number> },
  tabOrder: Array<{ index: number; tag: string; text: string; role: string; tabindex: string }>,
  pageTitle: string,
  pageUrl: string
): Promise<{ findings: StepResult[]; summary: string; tokens: number }> {
  const systemPrompt = `You are a UX accessibility expert. Analyze the provided accessibility data from a web page and identify ARIA issues, missing labels, tab order problems, semantic structure issues, and WCAG violations.

Return your analysis as JSON with this exact structure:
{
  "findings": [
    {
      "title": "Short title of the issue",
      "description": "Detailed description of what's wrong, why it matters, and how to fix it",
      "severity": "critical|major|minor|info",
      "wcag_ref": "WCAG guideline reference, e.g. 1.1.1, 2.4.6, 4.1.2",
      "selector": "CSS selector or element description"
    }
  ],
  "summary": "A 2-3 sentence overall summary of the page's accessibility status"
}`;

  const axTreeStr = JSON.stringify(axTree, null, 2).slice(0, 15000);
  const domIssuesStr = JSON.stringify(domAudit.issues, null, 2);
  const structureStr = JSON.stringify(domAudit.structure, null, 2);
  const tabOrderStr = JSON.stringify(tabOrder, null, 2).slice(0, 5000);

  const userPrompt = `Analyze the accessibility of "${pageTitle}" (${pageUrl}).

User instructions: ${config.instructions}

## Accessibility Tree (truncated)
${axTreeStr}

## DOM-Level Issues Found Automatically
${domIssuesStr}

## Page Structure Summary
${structureStr}

## Tab Order (first 50 focusable elements)
${tabOrderStr}

Based on all this data, provide a thorough UX accessibility analysis. Consider:
1. ARIA usage correctness (roles, states, properties)
2. Missing or incorrect labels
3. Tab order and keyboard navigation
4. Semantic HTML structure
5. Screen reader experience
6. WCAG 2.1 AA compliance

Include the automated DOM issues in your analysis and add any additional issues you identify from the accessibility tree. Return ONLY valid JSON matching the specified structure.`;

  const provider = config.llmProvider.toLowerCase();
  let findings: StepResult[] = [];
  let summary = "Analysis completed";
  let tokens = 0;

  try {
    if (provider === "openai" || provider === "ollama") {
      const baseUrl =
        config.llmBaseUrl ||
        (provider === "ollama"
          ? "http://localhost:11434/v1"
          : "https://api.openai.com/v1");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (config.llmApiKey) {
        headers["Authorization"] = `Bearer ${config.llmApiKey}`;
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.llmModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(
          `LLM API error ${response.status}: ${errBody.slice(0, 500)}`
        );
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage?: { total_tokens: number };
      };
      tokens = data.usage?.total_tokens ?? 0;
      const content = data.choices?.[0]?.message?.content ?? "";
      const parsed = parseJsonResponse(content);
      findings = parsed.findings;
      summary = parsed.summary;
    } else if (provider === "anthropic") {
      const baseUrl =
        config.llmBaseUrl || "https://api.anthropic.com/v1/messages";

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.llmApiKey ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.llmModel,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(
          `Anthropic API error ${response.status}: ${errBody.slice(0, 500)}`
        );
      }

      const data = (await response.json()) as {
        content: Array<{ type: string; text: string }>;
        usage?: { input_tokens: number; output_tokens: number };
      };
      tokens =
        (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
      const textBlock = data.content?.find((b) => b.type === "text");
      const content = textBlock?.text ?? "";
      const parsed = parseJsonResponse(content);
      findings = parsed.findings;
      summary = parsed.summary;
    } else {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  } catch (err) {
    // If LLM call fails, convert DOM audit issues into step results directly
    findings = domAudit.issues.map((issue, i) => ({
      index: i + 1,
      title: formatIssueType(issue.type),
      description: issue.detail,
      severity: getSeverityForIssueType(issue.type),
      selector: issue.selector,
    }));

    if (findings.length === 0) {
      findings = [
        {
          index: 1,
          title: "LLM Analysis Unavailable",
          description: `Could not complete LLM analysis: ${err instanceof Error ? err.message : String(err)}. DOM-level checks found no issues.`,
          severity: "info",
        },
      ];
    }

    summary = `LLM analysis failed; ${domAudit.issues.length} issue(s) found via automated DOM checks.`;
  }

  return { findings, summary, tokens };
}

function formatIssueType(type: string): string {
  const map: Record<string, string> = {
    "missing-alt": "Image Missing Alt Text",
    "empty-alt": "Image Has Empty Alt Text",
    "missing-label": "Form Control Missing Label",
    "missing-lang": "Missing Document Language",
    "missing-title": "Missing Page Title",
    "heading-skip": "Heading Level Skipped",
    "empty-interactive": "Interactive Element Without Accessible Name",
    "missing-landmark": "Missing ARIA Landmark",
    "positive-tabindex": "Positive Tabindex Disrupts Tab Order",
    "same-color-text-bg": "Text Color Matches Background",
  };
  return map[type] || type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSeverityForIssueType(type: string): StepResult["severity"] {
  const critical = ["missing-alt", "missing-label", "empty-interactive"];
  const major = [
    "missing-lang",
    "missing-title",
    "missing-landmark",
    "heading-skip",
  ];
  const minor = ["positive-tabindex", "empty-alt", "same-color-text-bg"];

  if (critical.includes(type)) return "critical";
  if (major.includes(type)) return "major";
  if (minor.includes(type)) return "minor";
  return "info";
}

function parseJsonResponse(content: string): {
  findings: StepResult[];
  summary: string;
} {
  let jsonStr = content;
  const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonStr.trim()) as {
      findings?: Array<{
        title: string;
        description: string;
        severity: string;
        wcag_ref?: string;
        selector?: string;
      }>;
      summary?: string;
    };

    const findings: StepResult[] = (parsed.findings ?? []).map((f, i) => ({
      index: i + 1,
      title: f.title || `Finding ${i + 1}`,
      description: f.description || "",
      severity: (["critical", "major", "minor", "info"].includes(f.severity)
        ? f.severity
        : "info") as StepResult["severity"],
      wcag_ref: f.wcag_ref,
      selector: f.selector,
    }));

    return {
      findings,
      summary: parsed.summary || "Analysis completed.",
    };
  } catch {
    return {
      findings: [
        {
          index: 1,
          title: "Raw Analysis",
          description: content.slice(0, 2000),
          severity: "info",
        },
      ],
      summary: content.slice(0, 500),
    };
  }
}

/**
 * Run a Playwright-based UX accessibility audit.
 *
 * Collects the accessibility tree, DOM-level checks, and tab order,
 * then sends everything to an LLM for expert analysis.
 */
export async function runPlaywrightAudit(
  config: EngineConfig
): Promise<RunResponse> {
  const startTime = Date.now();
  await mkdir(config.screenshotDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    await page.goto(config.url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const pageTitle = await page.title();

    // Capture screenshot for reference
    const screenshotPath = join(
      config.screenshotDir,
      `playwright-${Date.now()}.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Collect all accessibility data
    const { accessibilityTree, domAudit, tabOrder } =
      await collectAccessibilityData(page);

    // Send to LLM for expert analysis
    const analysis = await callLlmForUxAnalysis(
      config,
      accessibilityTree,
      domAudit,
      tabOrder,
      pageTitle,
      config.url
    );

    // Attach screenshot path to all findings
    const steps = analysis.findings.map((f) => ({
      ...f,
      screenshot_path: screenshotPath,
    }));

    const totalDuration = Date.now() - startTime;

    return {
      steps,
      summary: analysis.summary,
      total_tokens: analysis.tokens,
      total_duration_ms: totalDuration,
    };
  } finally {
    await browser.close();
  }
}

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { EngineConfig, RunResponse, StepResult } from "../types.js";

/**
 * Attempt to call LLM to analyze a screenshot with the given instructions.
 * Supports OpenAI-compatible, Anthropic, and Ollama providers.
 */
async function callLlmForAnalysis(
  config: EngineConfig,
  screenshotBase64: string,
  pageTitle: string,
  pageUrl: string
): Promise<{ findings: StepResult[]; summary: string; tokens: number }> {
  const systemPrompt = `You are a UI visual audit expert. Analyze the provided screenshot of a web page and identify visual issues, layout problems, design inconsistencies, and accessibility concerns.

Return your analysis as JSON with this exact structure:
{
  "findings": [
    {
      "title": "Short title of the issue",
      "description": "Detailed description of what's wrong and how to fix it",
      "severity": "critical|major|minor|info",
      "wcag_ref": "WCAG guideline reference if applicable, e.g. 1.4.3",
      "selector": "CSS selector or description of the element if identifiable"
    }
  ],
  "summary": "A 2-3 sentence overall summary of the page's visual quality and issues found"
}`;

  const userPrompt = `Analyze this screenshot of "${pageTitle}" (${pageUrl}).

Instructions from the user:
${config.instructions}

Identify visual UI issues including:
- Color contrast problems
- Layout/alignment issues
- Overlapping elements
- Truncated text
- Inconsistent spacing
- Missing visual feedback states
- Poor visual hierarchy
- Responsive design issues visible in the screenshot

Return ONLY valid JSON matching the specified structure.`;

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
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${screenshotBase64}`,
                  },
                },
              ],
            },
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
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: screenshotBase64,
                  },
                },
                { type: "text", text: userPrompt },
              ],
            },
          ],
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
    // If LLM call fails, return a single info step describing the error
    findings = [
      {
        index: 1,
        title: "LLM Analysis Unavailable",
        description: `Could not complete LLM analysis: ${err instanceof Error ? err.message : String(err)}`,
        severity: "info",
      },
    ];
    summary = "LLM analysis failed; screenshot was captured successfully.";
  }

  return { findings, summary, tokens };
}

/**
 * Parse a potentially messy JSON response from an LLM.
 */
function parseJsonResponse(content: string): {
  findings: StepResult[];
  summary: string;
} {
  // Try to extract JSON from code fences or raw response
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
    // If JSON parsing fails, treat the whole response as a summary
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
 * Run a Midscene.js-based UI visual audit.
 *
 * Tries to use @midscene/web for AI-driven page understanding.
 * Falls back to Playwright screenshot + direct LLM analysis if Midscene
 * is not available or fails.
 */
export async function runMidsceneAudit(
  config: EngineConfig
): Promise<RunResponse> {
  const startTime = Date.now();
  await mkdir(config.screenshotDir, { recursive: true });

  // First, try the native @midscene/web approach
  try {
    const midscene = await import("@midscene/web");

    // Set up environment variables that Midscene reads for LLM config
    if (config.llmApiKey) {
      if (config.llmProvider === "openai") {
        process.env.OPENAI_API_KEY = config.llmApiKey;
        if (config.llmBaseUrl)
          process.env.OPENAI_BASE_URL = config.llmBaseUrl;
        if (config.llmModel) process.env.MIDSCENE_MODEL_NAME = config.llmModel;
      } else if (config.llmProvider === "anthropic") {
        process.env.ANTHROPIC_API_KEY = config.llmApiKey;
        if (config.llmModel) process.env.MIDSCENE_MODEL_NAME = config.llmModel;
      }
    }

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

      // Use Midscene's PageAgent for AI-powered page understanding
      const AgentClass =
        "PageAgent" in midscene ? midscene.PageAgent : null;

      if (AgentClass) {
        const agent = new (AgentClass as new (page: unknown) => {
          aiAssert: (assertion: string) => Promise<void>;
          aiQuery: (query: string) => Promise<unknown>;
        })(page);

        // Use Midscene AI to query the page based on instructions
        const queryResult = await agent.aiQuery(config.instructions);

        const screenshotPath = join(
          config.screenshotDir,
          `midscene-${Date.now()}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const totalDuration = Date.now() - startTime;

        return {
          steps: [
            {
              index: 1,
              title: "Midscene AI Analysis",
              description:
                typeof queryResult === "string"
                  ? queryResult
                  : JSON.stringify(queryResult, null, 2),
              severity: "info",
              screenshot_path: screenshotPath,
            },
          ],
          summary: `Midscene analysis completed for ${config.url}`,
          total_tokens: 0, // Midscene handles tokens internally
          total_duration_ms: totalDuration,
        };
      }

      // If PageAgent not found, fall through to screenshot-based approach
      throw new Error("Midscene PageAgent not available in module exports");
    } finally {
      await browser.close();
    }
  } catch (midsceneErr) {
    // Midscene not available or failed — fall back to screenshot + LLM
    console.warn(
      `Midscene native approach unavailable, falling back to screenshot+LLM: ${midsceneErr instanceof Error ? midsceneErr.message : String(midsceneErr)}`
    );
  }

  // Fallback: Playwright screenshot + LLM vision analysis
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

    // Capture full-page screenshot
    const screenshotPath = join(
      config.screenshotDir,
      `midscene-full-${Date.now()}.png`
    );
    const screenshotBuffer = await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    const screenshotBase64 = screenshotBuffer.toString("base64");

    // Also capture viewport screenshot
    const viewportScreenshotPath = join(
      config.screenshotDir,
      `midscene-viewport-${Date.now()}.png`
    );
    await page.screenshot({ path: viewportScreenshotPath, fullPage: false });

    // Send screenshot to LLM for visual analysis
    const analysis = await callLlmForAnalysis(
      config,
      screenshotBase64,
      pageTitle,
      config.url
    );

    // Attach screenshot path to findings
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

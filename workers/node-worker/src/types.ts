/** Request body for both /midscene/run and /playwright/run */
export interface RunRequest {
  /** The URL to audit */
  url: string;
  /** Natural-language instructions describing what to check */
  instructions: string;
  /** LLM provider: "openai" | "anthropic" | "ollama" */
  llm_provider: string;
  /** API key for the LLM provider */
  llm_api_key?: string;
  /** Model identifier, e.g. "gpt-4o", "claude-sonnet-4-20250514" */
  llm_model: string;
  /** Base URL override (useful for Ollama or proxies) */
  llm_base_url?: string;
  /** Directory to save screenshots into */
  screenshot_dir?: string;
}

/** A single step/finding from the audit run */
export interface StepResult {
  /** Step number */
  index: number;
  /** Short title for this finding */
  title: string;
  /** Detailed description */
  description: string;
  /** Severity: "critical" | "major" | "minor" | "info" */
  severity: "critical" | "major" | "minor" | "info";
  /** WCAG guideline reference, if applicable */
  wcag_ref?: string;
  /** Selector or element path related to this finding */
  selector?: string;
  /** Path to a screenshot capturing this finding */
  screenshot_path?: string;
}

/** Response body returned from both endpoints */
export interface RunResponse {
  /** Individual findings / steps */
  steps: StepResult[];
  /** High-level summary of the audit */
  summary: string;
  /** Total LLM tokens consumed */
  total_tokens: number;
  /** Total wall-clock time in milliseconds */
  total_duration_ms: number;
}

/** Internal configuration derived from RunRequest for engine runners */
export interface EngineConfig {
  url: string;
  instructions: string;
  llmProvider: string;
  llmApiKey?: string;
  llmModel: string;
  llmBaseUrl?: string;
  screenshotDir: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  user: User;
}

export interface TestStep {
  id: string;
  test_id: string;
  step_number: number;
  action: string;
  description: string;
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  screenshot_url?: string;
  error_message?: string;
  duration_ms?: number;
  started_at?: string;
  completed_at?: string;
}

export interface Test {
  id: string;
  name: string;
  target_url: string;
  engine: "uat" | "ui_audit" | "ux_audit";
  instructions?: string;
  status: "pending" | "running" | "passed" | "failed" | "cancelled";
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  duration_ms?: number;
  cost?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  steps?: TestStep[];
  file_url?: string;
}

export interface DashboardStats {
  total_tests: number;
  pass_rate: number;
  last_run: string | null;
  tests_today: number;
}

export interface Setting {
  key: string;
  value: string;
  category: string;
  description?: string;
}

export interface MCPToken {
  id: string;
  name: string;
  token: string;
  created_at: string;
  last_used_at?: string;
}

export interface MCPConfig {
  endpoint: string;
  transport: string;
  version: string;
}

export interface AdminLog {
  id: string;
  action: string;
  user_id: string;
  user_name: string;
  details: string;
  created_at: string;
  level: "info" | "warning" | "error";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface SSEEvent {
  type: "step_update" | "test_complete" | "error" | "heartbeat";
  data: {
    step?: TestStep;
    test?: Test;
    message?: string;
  };
}

export interface CreateTestPayload {
  name: string;
  target_url: string;
  engine: "uat" | "ui_audit" | "ux_audit";
  instructions?: string;
  run_immediately?: boolean;
}

export interface UpdateSettingsPayload {
  settings: Record<string, string>;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "user";
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: "admin" | "user";
  is_active?: boolean;
}

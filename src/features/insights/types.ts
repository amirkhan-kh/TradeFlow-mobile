export type Severity = "high" | "medium" | "low";

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
  href: string;
}

export interface InsightAgent {
  key: "stock" | "finance" | "audit" | "sales" | "logistics";
  name: string;
  role: string;
  findings: Finding[];
}

export interface InsightsData {
  generated_at: string;
  forecast_next_month: number;
  agents: InsightAgent[];
}

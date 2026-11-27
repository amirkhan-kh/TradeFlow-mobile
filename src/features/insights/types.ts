export type Severity = "high" | "medium" | "low";

export interface InsightAction {
  type: "create_audit";
  label: string;
  warehouse_id: number;
  auditor_id?: number | null;
}

export interface Finding {
  key: string;
  severity: Severity;
  title: string;
  detail: string;
  href: string;
  action: InsightAction | null;
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

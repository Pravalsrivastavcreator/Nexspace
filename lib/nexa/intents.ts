/**
 * lib/nexa/intents.ts
 * -------------------
 * Controlled intents, action whitelist, and route mappings for NEXA.
 */

export type NexaIntent =
  | "GENERAL_INFO"
  | "UPLOAD"
  | "QUERY"
  | "VQA"
  | "OBJECT_DETECTION"
  | "CHANGE_DETECTION"
  | "SAR"
  | "GIS"
  | "RESULT_EXPLANATION"
  | "EVIDENCE"
  | "EXECUTION_TRACE"
  | "REPORT"
  | "NAVIGATION"
  | "OUT_OF_SCOPE";

export type WhitelistedActionType =
  | "OPEN_UPLOAD"
  | "OPEN_QUERY"
  | "OPEN_GROUNDING"
  | "OPEN_VQA"
  | "OPEN_CHANGE_ANALYSIS"
  | "OPEN_RESULTS"
  | "OPEN_EVIDENCE_VIEWER"
  | "OPEN_EXECUTION_TRACE"
  | "OPEN_EXECUTION_LOG"
  | "OPEN_REPORT"
  | "OPEN_DASHBOARD"
  | "OPEN_SETTINGS";

export interface NexaAction {
  type: WhitelistedActionType;
  label: string;
  route: string;
  prefillQuery?: string;
  params?: Record<string, string>;
}

export const ALLOWED_ACTIONS: Record<WhitelistedActionType, { defaultLabel: string; route: string }> = {
  OPEN_UPLOAD: { defaultLabel: "Go to Upload Ingest", route: "/upload" },
  OPEN_QUERY: { defaultLabel: "Open Query Hub", route: "/query" },
  OPEN_GROUNDING: { defaultLabel: "Start Object Detection", route: "/query" },
  OPEN_VQA: { defaultLabel: "Ask a Visual Question", route: "/query" },
  OPEN_CHANGE_ANALYSIS: { defaultLabel: "Start Change Analysis", route: "/comparison" },
  OPEN_RESULTS: { defaultLabel: "View Scan Results", route: "/results" },
  OPEN_EVIDENCE_VIEWER: { defaultLabel: "Open Evidence Viewer", route: "/evidence" },
  OPEN_EXECUTION_TRACE: { defaultLabel: "View Execution Trace", route: "/execution" },
  OPEN_EXECUTION_LOG: { defaultLabel: "View Execution Log", route: "/execution-log" },
  OPEN_REPORT: { defaultLabel: "Generate / View Report", route: "/reports" },
  OPEN_DASHBOARD: { defaultLabel: "Open Dashboard", route: "/dashboard" },
  OPEN_SETTINGS: { defaultLabel: "Open Settings", route: "/settings" },
};

export function isValidAction(action: any): action is NexaAction {
  if (!action || typeof action !== "object") return false;
  const type = action.type as WhitelistedActionType;
  return Boolean(type && ALLOWED_ACTIONS[type]);
}

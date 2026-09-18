/**
 * lib/nexa/gemini.ts
 * ------------------
 * Server-side Gemini caller with grounded intent extraction and offline fallback.
 */

import { buildNexaSystemPrompt } from "./systemPrompt";
import { findKnowledgeMatch, NEXSPACE_KNOWLEDGE } from "./knowledge";
import { ALLOWED_ACTIONS, NexaAction, NexaIntent, WhitelistedActionType } from "./intents";

export interface NexaChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface NexaAppContext {
  currentPage?: string;
  hasSourceImage?: boolean;
  sourceImageFilename?: string;
  sourceImageSource?: string;
  hasInvestigation?: boolean;
  investigationId?: string;
  lastQuery?: string;
  detectionsCount?: number;
  hasChangeAnalysis?: boolean;
  anomaliesCount?: number;
  changedFraction?: number;
  backendStatus?: string;
}

export interface NexaResponsePayload {
  message: string;
  intent: NexaIntent;
  action?: NexaAction | null;
  suggestions?: string[];
  provider?: "gemini" | "local_knowledge_engine";
}

/**
 * Heuristic & Knowledge-based intent resolver when Gemini API is unavailable or unconfigured.
 */
function resolveLocally(
  userMessage: string,
  appContext?: NexaAppContext
): NexaResponsePayload {
  const text = userMessage.toLowerCase().trim();

  // Check for direct knowledge match first
  const match = findKnowledgeMatch(userMessage);

  // 1. Out of scope / Greetings
  if (["hi", "hello", "hey", "hola", "sup", "greetings"].includes(text)) {
    return {
      message: "Hello! I'm **NEXA**, your official NexSpace AI Guide 👋\n\nI can help you explore satellite imagery, run object detection, ask visual questions (VQA), compare bi-temporal scenes, and inspect evidence. What would you like to investigate today?",
      intent: "GENERAL_INFO",
      action: {
        type: "OPEN_QUERY",
        label: "Explore Query Hub",
        route: "/query",
      },
      suggestions: [
        "How do I upload satellite imagery?",
        "How do I detect buildings in an image?",
        "How do I compare two satellite images?",
        "What is SAR radar?",
      ],
      provider: "local_knowledge_engine",
    };
  }

  // 2. Upload intent
  if (text.includes("upload") || text.includes("ingest") || text.includes("add image") || text.includes("import raster")) {
    return {
      message: "You can upload and ingest satellite rasters (GeoTIFF, TIFF, PNG, JPEG, or ZIP bundles with multispectral bands) directly in the **Upload Ingest** pipeline.",
      intent: "UPLOAD",
      action: {
        type: "OPEN_UPLOAD",
        label: "Go to Upload Ingest",
        route: "/upload",
      },
      suggestions: ["What raster formats are supported?", "How does CRS validation work?"],
      provider: "local_knowledge_engine",
    };
  }

  // 3. Object Detection / Building / Ship / Vehicle
  if (
    text.includes("building") ||
    text.includes("ship") ||
    text.includes("boat") ||
    text.includes("vessel") ||
    text.includes("vehicle") ||
    text.includes("car") ||
    text.includes("detect") ||
    text.includes("grounding") ||
    text.includes("find ") ||
    text.includes("locate")
  ) {
    const target = text.includes("building")
      ? "buildings"
      : text.includes("ship") || text.includes("boat") || text.includes("vessel")
      ? "vessels"
      : text.includes("vehicle") || text.includes("car")
      ? "vehicles"
      : "objects";

    if (appContext?.hasSourceImage) {
      return {
        message: `Your image (**${appContext.sourceImageFilename || "Active Image"}**) is loaded. We can run **Grounding DINO** to locate ${target} and generate normalized bounding boxes and spatial coordinates.`,
        intent: "OBJECT_DETECTION",
        action: {
          type: "OPEN_GROUNDING",
          label: `Detect ${target.toUpperCase()}`,
          route: "/query",
          prefillQuery: `Locate the ${target}`,
        },
        suggestions: ["Describe this image", "Is there water in this image?", "View scan results"],
        provider: "local_knowledge_engine",
      };
    } else {
      return {
        message: `To detect ${target}, first select or upload a satellite image in the **Upload Ingest** section or use one of our verified demo tiles on the Query page.`,
        intent: "OBJECT_DETECTION",
        action: {
          type: "OPEN_UPLOAD",
          label: "Upload Satellite Image",
          route: "/upload",
        },
        suggestions: ["Open Query with demo tile", "What formats are supported?"],
        provider: "local_knowledge_engine",
      };
    }
  }

  // 4. Change Analysis / Compare
  if (
    text.includes("change") ||
    text.includes("compare") ||
    text.includes("two image") ||
    text.includes("difference") ||
    text.includes("temporal") ||
    text.includes("before and after")
  ) {
    return {
      message: "To analyze changes across dates, open the **Bi-Temporal Change Analysis Terminal**. You can upload or select two co-registered images to calculate pixel deltas, severity heatmaps, and surface anomaly polygons.",
      intent: "CHANGE_DETECTION",
      action: {
        type: "OPEN_CHANGE_ANALYSIS",
        label: "Start Change Analysis",
        route: "/comparison",
      },
      suggestions: ["What is bi-temporal analysis?", "How are change anomalies categorized?"],
      provider: "local_knowledge_engine",
    };
  }

  // 5. Evidence Viewer
  if (text.includes("evidence") || text.includes("bounding box") || text.includes("spatial localization")) {
    return {
      message: "The **Evidence Viewer** enables granular spatial verification of every detected target, displaying coordinate transforms, model confidence, and zoomed evidence crops.",
      intent: "EVIDENCE",
      action: {
        type: "OPEN_EVIDENCE_VIEWER",
        label: "Open Evidence Viewer",
        route: "/evidence",
      },
      suggestions: ["View scan results", "How did it reach this result?", "Generate PDF report"],
      provider: "local_knowledge_engine",
    };
  }

  // 6. Trace / Execution Log
  if (text.includes("trace") || text.includes("log") || text.includes("how did it reach") || text.includes("pipeline stages")) {
    return {
      message: "You can inspect the exact neural routing decision, tool dispatch, and step-by-step latency inside the **Execution Trace** dashboard.",
      intent: "EXECUTION_TRACE",
      action: {
        type: "OPEN_EXECUTION_TRACE",
        label: "View Execution Trace",
        route: "/execution",
      },
      suggestions: ["Open live Execution Log", "What models are used in NexSpace?"],
      provider: "local_knowledge_engine",
    };
  }

  // 7. Report Generation
  if (text.includes("report") || text.includes("export") || text.includes("pdf") || text.includes("download summary")) {
    if (appContext?.hasInvestigation) {
      return {
        message: `Investigation **${appContext.investigationId || "Active"}** is ready. You can inspect the compiled executive summary, spatial metrics, and download or print the PDF investigation dossier.`,
        intent: "REPORT",
        action: {
          type: "OPEN_REPORT",
          label: "View & Export Report",
          route: "/reports",
        },
        suggestions: ["Open Evidence Viewer", "View Scan Results"],
        provider: "local_knowledge_engine",
      };
    } else {
      return {
        message: "You can view and export formal PDF reports once an analysis is executed. Run a query or change analysis first, and NexSpace will assemble the complete dossier.",
        intent: "REPORT",
        action: {
          type: "OPEN_QUERY",
          label: "Run Query to Generate Report",
          route: "/query",
        },
        suggestions: ["How do I detect buildings?", "How do I compare two images?"],
        provider: "local_knowledge_engine",
      };
    }
  }

  // 8. Result Explanation
  if (text.includes("explain") || text.includes("what does this mean") || text.includes("result")) {
    if (appContext?.hasInvestigation) {
      const dets = appContext.detectionsCount || 0;
      return {
        message: `Your investigation for query *"${appContext.lastQuery || "Recent Analysis"}"* identified **${dets} localized target(s)**. You can inspect each target's bounding box and confidence score in the Evidence Viewer or generate a formal PDF report.`,
        intent: "RESULT_EXPLANATION",
        action: {
          type: "OPEN_RESULTS",
          label: "Inspect Results",
          route: "/results",
        },
        suggestions: ["Open Evidence Viewer", "View Execution Trace", "Generate Report"],
        provider: "local_knowledge_engine",
      };
    } else {
      return {
        message: "NexSpace outputs structured findings including localized bounding boxes, VQA answers, and change anomaly clusters. Select an image and execute an investigation on the Query or Comparison page to see live results.",
        intent: "RESULT_EXPLANATION",
        action: {
          type: "OPEN_QUERY",
          label: "Open Query Terminal",
          route: "/query",
        },
        suggestions: ["Locate buildings", "Is there water in this image?"],
        provider: "local_knowledge_engine",
      };
    }
  }

  // 9. If we have a knowledge match
  if (match) {
    return {
      message: match.detailedText,
      intent: match.category.toUpperCase() as NexaIntent,
      action: match.suggestedAction ? {
        type: match.suggestedAction.type as WhitelistedActionType,
        label: match.suggestedAction.label,
        route: match.suggestedAction.route,
      } : null,
      suggestions: [
        "How do I upload an image?",
        "What is Grounding DINO?",
        "How do I compare two images?",
      ],
      provider: "local_knowledge_engine",
    };
  }

  // 10. Default fallback
  return {
    message: "I'm **NEXA**, the official NexSpace AI Guide. I can help guide you through uploading satellite rasters, running Grounding DINO object detection, visual question answering (VQA), bi-temporal change analysis, SAR radar fusion, and generating intelligence reports.",
    intent: "GENERAL_INFO",
    action: {
      type: "OPEN_QUERY",
      label: "Open Query Hub",
      route: "/query",
    },
    suggestions: [
      "How do I upload an image?",
      "Find buildings in my image",
      "Compare two satellite images",
      "What is SAR radar?",
    ],
    provider: "local_knowledge_engine",
  };
}

/**
 * Send request to Google Gemini API with fallback to local resolver
 */
export async function queryNexaWithGemini(
  userMessage: string,
  history: NexaChatMessage[] = [],
  appContext?: NexaAppContext
): Promise<NexaResponsePayload> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    // No API key configured -> Use local grounded knowledge engine
    return resolveLocally(userMessage, appContext);
  }

  try {
    const systemPrompt = buildNexaSystemPrompt(appContext);

    // Format contents for Gemini v1beta REST API
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // System instruction passed in request or prepended
    const recentHistory = history.slice(-8);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 1000,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[NEXA Gemini] API returned status ${res.status}, falling back to local knowledge.`);
      return resolveLocally(userMessage, appContext);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return resolveLocally(userMessage, appContext);
    }

    try {
      const parsed = JSON.parse(rawText);
      let validatedAction: NexaAction | null = null;

      if (parsed.action && typeof parsed.action === "object" && parsed.action.type) {
        const actType = parsed.action.type as WhitelistedActionType;
        if (ALLOWED_ACTIONS[actType]) {
          validatedAction = {
            type: actType,
            label: parsed.action.label || ALLOWED_ACTIONS[actType].defaultLabel,
            route: ALLOWED_ACTIONS[actType].route,
            prefillQuery: parsed.action.prefillQuery,
            params: parsed.action.params,
          };
        }
      }

      return {
        message: parsed.message || "I am NEXA, your NexSpace guide.",
        intent: (parsed.intent || "GENERAL_INFO") as NexaIntent,
        action: validatedAction,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        provider: "gemini",
      };
    } catch (parseErr) {
      console.warn("[NEXA Gemini] Failed to parse JSON response:", parseErr);
      return {
        message: rawText,
        intent: "GENERAL_INFO",
        action: null,
        suggestions: ["How do I upload an image?", "What is Grounding DINO?"],
        provider: "gemini",
      };
    }
  } catch (err: any) {
    console.warn("[NEXA Gemini] Call failed or timed out:", err?.message);
    return resolveLocally(userMessage, appContext);
  }
}

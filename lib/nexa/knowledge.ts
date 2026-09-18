/**
 * lib/nexa/knowledge.ts
 * ---------------------
 * Verified, grounded knowledge base for NexSpace AI Guide (NEXA).
 * All capabilities, routes, models, and workflows described here match
 * the actual NexSpace platform implementation.
 */

export interface KnowledgeItem {
  id: string;
  category: "general" | "upload" | "query" | "vqa" | "grounding" | "change" | "sar" | "gis" | "results" | "evidence" | "execution" | "reports";
  keywords: string[];
  question: string;
  summary: string;
  detailedText: string;
  suggestedAction?: {
    type: string;
    label: string;
    route: string;
  };
}

export const NEXSPACE_KNOWLEDGE: KnowledgeItem[] = [
  // 1. General Info
  {
    id: "general_what_is_nexspace",
    category: "general",
    keywords: ["what is nexspace", "about nexspace", "nexspace do", "purpose", "overview", "platform"],
    question: "What is NexSpace?",
    summary: "NexSpace is an advanced Orbital Geospatial Intelligence Platform powered by multi-specialist AI vision models.",
    detailedText: "NexSpace is an end-to-end orbital intelligence platform designed for automated satellite imagery analysis. It combines natural language querying, automated object grounding, visual question answering (VQA), bi-temporal change detection, and Synthetic Aperture Radar (SAR) processing with verifiable evidence graphs and PDF intelligence reports.",
    suggestedAction: {
      type: "OPEN_DASHBOARD",
      label: "Open Dashboard",
      route: "/dashboard",
    },
  },
  {
    id: "general_capabilities",
    category: "general",
    keywords: ["capabilities", "features", "what can i do", "how to use", "tools", "which tool", "what to do"],
    question: "What capabilities and tools does NexSpace offer?",
    summary: "NexSpace provides 5 core operational workflows: Ingest & Upload, Natural Language Query & Grounding, Bi-Temporal Change Analysis, Evidence Verification, and Automated Intelligence Reports.",
    detailedText: "In NexSpace you can:\n• **Upload & Ingest**: Process optical and SAR rasters into Cloud-Optimized GeoTIFFs.\n• **Natural Language Query**: Detect specific objects (buildings, roads, vessels, water) using Grounding DINO and ask questions with PaliGemma VQA.\n• **Change Detection**: Perform bi-temporal pixel differencing and anomaly extraction across two dates.\n• **Evidence Viewer**: Inspect bounding boxes, confidence metrics, and spatial localization.\n• **Execution Trace**: Review step-by-step model inference pipelines.\n• **Reports**: Generate and export structured geospatial investigation summaries and PDFs.",
    suggestedAction: {
      type: "OPEN_QUERY",
      label: "Explore Query Hub",
      route: "/query",
    },
  },

  // 2. Upload / Ingest
  {
    id: "upload_guidance",
    category: "upload",
    keywords: ["upload", "how to upload", "where to upload", "ingest", "add image", "supported formats", "geotiff", "tiff", "png", "jpeg"],
    question: "How do I upload satellite imagery?",
    summary: "You can upload satellite imagery directly from the Upload Ingest page or choose from pre-loaded demo tiles.",
    detailedText: "Go to the **Upload Ingest** page (/upload). You can drag and drop raster files (GeoTIFF, TIFF, PNG, JPEG, or ZIP bundles with multispectral bands like RGB, NIR, SWIR). NexSpace validates projections (e.g. EPSG:32651), extracts geospatial metadata, and registers the active source image across all analysis terminals.",
    suggestedAction: {
      type: "OPEN_UPLOAD",
      label: "Go to Upload Ingest",
      route: "/upload",
    },
  },

  // 3. Object Grounding / Detection
  {
    id: "grounding_detection",
    category: "grounding",
    keywords: ["find buildings", "detect objects", "locate", "grounding", "dino", "bounding box", "vessels", "ships", "roads", "water", "infrastructure"],
    question: "How do I detect buildings, vehicles, or infrastructure in satellite imagery?",
    summary: "NexSpace uses open-vocabulary neural grounding (Grounding DINO) to locate objects from natural language prompts.",
    detailedText: "Navigate to the **Query** page (/query) with an uploaded or demo image. Type a prompt like *'Locate the buildings'* or *'Detect vessels in the harbor'*. Grounding DINO identifies target objects, generates normalized bounding boxes (0..1000 coordinate space), calculates spatial coordinates, and links them to verifiable evidence cards.",
    suggestedAction: {
      type: "OPEN_GROUNDING",
      label: "Start Object Detection",
      route: "/query",
    },
  },

  // 4. Visual Question Answering (VQA)
  {
    id: "vqa_workflow",
    category: "vqa",
    keywords: ["vqa", "ask questions", "is there water", "is there a road", "how many", "caption", "describe image", "paligemma"],
    question: "Can I ask questions about a satellite image?",
    summary: "Yes, NexSpace routes visual questions to specialized remote sensing VQA models (PaliGemma / RSVQA) and BLIP captioning.",
    detailedText: "On the **Query** page (/query), ask natural language questions such as *'Is there water present?'* or *'Describe this scene'*. NexSpace decomposes complex queries into binary sub-questions, executes neural VQA, and produces confidence-calibrated findings with execution reasoning.",
    suggestedAction: {
      type: "OPEN_VQA",
      label: "Ask a Visual Question",
      route: "/query",
    },
  },

  // 5. Change Detection / Bi-Temporal
  {
    id: "change_analysis",
    category: "change",
    keywords: ["change detection", "compare images", "two images", "what changed", "before and after", "bi-temporal", "temporal", "construction", "deforestation"],
    question: "How do I compare two satellite images to find changes?",
    summary: "The Bi-Temporal Change Analysis Terminal compares two registered images from different dates to highlight pixel deltas and anomalies.",
    detailedText: "Go to the **Comparison** page (/comparison). Upload or select two images (Image A: Before, Image B: After). NexSpace computes co-registered differential pixel intensity, generates an interactive opacity slider and delta heatmap, clusters anomaly regions with severity scores (High/Medium/Low), and calculates the percentage of changed surface area.",
    suggestedAction: {
      type: "OPEN_CHANGE_ANALYSIS",
      label: "Open Comparison Terminal",
      route: "/comparison",
    },
  },

  // 6. Synthetic Aperture Radar (SAR)
  {
    id: "sar_intelligence",
    category: "sar",
    keywords: ["sar", "synthetic aperture radar", "radar", "optical vs sar", "clouds", "night imaging", "fusion", "cross modal"],
    question: "What is SAR and how does NexSpace analyze radar imagery?",
    summary: "SAR uses microwave radar pulses to penetrate clouds, smoke, and darkness, providing all-weather 24/7 earth observation.",
    detailedText: "Synthetic Aperture Radar (SAR) sends active radio frequency pulses and measures backscatter reflections. Unlike optical cameras, SAR works at night and through cloud cover. In NexSpace, you can analyze SAR rasters, generate SAR descriptions, and perform Optical + SAR multi-modal feature fusion to verify surface dielectric and structural properties.",
    suggestedAction: {
      type: "OPEN_QUERY",
      label: "Analyze SAR / Fusion",
      route: "/query",
    },
  },

  // 7. GIS & Geospatial
  {
    id: "gis_coordinates",
    category: "gis",
    keywords: ["gis", "crs", "coordinates", "epsg", "georeferencing", "projection", "geospatial", "world coordinates", "utm", "geojson"],
    question: "How does NexSpace handle GIS and geographic coordinates?",
    summary: "NexSpace preserves Coordinate Reference Systems (CRS/EPSG), georeferenced transforms, and exports GeoJSON feature collections.",
    detailedText: "When GeoTIFF rasters are uploaded, NexSpace extracts native CRS metadata (such as UTM Projected or WGS84 Geographic) and affine transform matrices. Detected object bounding boxes and change anomalies are transformed into real-world geographic coordinates and GeoJSON polygons with ground area calculations (m² / km²).",
    suggestedAction: {
      type: "OPEN_EVIDENCE_VIEWER",
      label: "Inspect Spatial Coordinates",
      route: "/evidence",
    },
  },

  // 8. Results & Evidence Viewer
  {
    id: "results_and_evidence",
    category: "evidence",
    keywords: ["results", "scan results", "evidence", "evidence viewer", "bounding boxes", "inspect", "confidence score"],
    question: "How do I inspect scan results and evidence?",
    summary: "The Scan Results (/results) and Evidence Viewer (/evidence) pages provide deep inspection of every detected target.",
    detailedText: "• **Scan Results** (/results): View tabular summaries of all identified objects, categories, confidence scores, and bounding boxes.\n• **Evidence Viewer** (/evidence): Pan, zoom, and inspect high-resolution crops of localized objects with neural model provenance and spatial coordinates.",
    suggestedAction: {
      type: "OPEN_EVIDENCE_VIEWER",
      label: "Open Evidence Viewer",
      route: "/evidence",
    },
  },

  // 9. Execution Trace & Logs
  {
    id: "execution_trace",
    category: "execution",
    keywords: ["execution trace", "trace", "pipeline", "execution log", "how did it reach result", "model stages", "timing"],
    question: "How did NexSpace reach its result? What is Execution Trace?",
    summary: "Execution Trace (/execution) and Execution Log (/execution-log) show step-by-step ML pipeline timing, router decisions, and model traces.",
    detailedText: "NexSpace transparently logs every inference step: Query Intent Classification -> Model Dispatch (BLIP / Grounding DINO / PaliGemma / Difference Engine) -> Post-processing & Bounding Box Normalization -> Evidence Assembly. You can review millisecond timing, parameters, and fallback metrics on the Execution Trace page.",
    suggestedAction: {
      type: "OPEN_EXECUTION_TRACE",
      label: "View Execution Trace",
      route: "/execution",
    },
  },

  // 10. Reports
  {
    id: "reports_generation",
    category: "reports",
    keywords: ["report", "generate report", "pdf", "export", "investigation report", "summary download"],
    question: "Can I generate and download an investigation report?",
    summary: "Yes, the Reports page (/reports) compiles the full investigation into an executive summary with spatial metrics and printable PDF export.",
    detailedText: "The **Reports** page (/reports) automatically aggregates the active source image, observations, interpretations, localized target table, spatial coverage, and model limitations into a formal verification dossier that can be exported or printed as PDF.",
    suggestedAction: {
      type: "OPEN_REPORT",
      label: "Open Investigation Report",
      route: "/reports",
    },
  },
];

/**
 * Find best matching knowledge item for a query using keyword and phrase matching
 */
export function findKnowledgeMatch(query: string): KnowledgeItem | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  let bestMatch: KnowledgeItem | null = null;
  let highestScore = 0;

  for (const item of NEXSPACE_KNOWLEDGE) {
    let score = 0;
    // Direct question or summary match
    if (q.includes(item.question.toLowerCase())) score += 10;
    if (item.question.toLowerCase().includes(q) && q.length > 5) score += 8;

    // Keyword matches
    for (const kw of item.keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += kw.split(" ").length * 3;
      }
    }

    if (score > highestScore && score >= 3) {
      highestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
}

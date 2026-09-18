/**
 * app/types/nexspace.ts
 * ---------------------
 * Centralized TypeScript type definitions mirroring the NexSpace FastAPI Backend Schemas.
 */

export interface GeoSpatialResolution {
  x: number;
  y: number;
  unit: string;
}

export interface GeoSpatialBounds {
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
}

export interface GeoMetadata {
  geospatial_available: boolean;
  crs?: string | null;
  crs_type?: "geographic" | "projected" | null;
  crs_epsg?: number | null;
  crs_units?: string | null;
  transform?: {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
  } | null;
  resolution?: GeoSpatialResolution | null;
  bounds_world?: GeoSpatialBounds | null;
  dimensions_pixel?: {
    width: number;
    height: number;
  } | null;
  reason?: string | null;
}

export interface GeoJSONGeometry {
  type: "Polygon" | "Point" | "MultiPolygon";
  coordinates: number[] | number[][] | number[][][];
}

export interface GeoJSONFeature {
  type: "Feature";
  id?: string;
  geometry: GeoJSONGeometry;
  properties: {
    evidence_id?: string;
    type?: string;
    label?: string;
    source?: string;
    confidence?: number;
    ground_area?: number;
    ground_area_unit?: string;
    native_crs?: string;
    bbox_pixel?: number[];
    [key: string]: unknown;
  };
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  geospatial_available: boolean;
  crs?: {
    type: string;
    properties: {
      name: string;
    };
  };
  features: GeoJSONFeature[];
}

export interface TraceStage {
  stage: string;
  status: "started" | "completed" | "failed" | "skipped" | "partial_success";
  started_at: string;
  completed_at?: string | null;
  timestamp?: string;
  duration_ms: number;
  metadata?: Record<string, unknown>;
  details?: Record<string, unknown>;
  error?: string | null;
}

export interface EvidenceNode {
  evidence_id: string;
  type: "object_detection" | "change_region" | "vqa_finding" | "optical_caption" | "sar_caption" | "multimodal_fusion" | string;
  source_tool: string;
  source_model: string;
  derived_from: string[];
  payload: {
    box?: number[];
    bbox_pixel?: number[];
    bbox_normalized?: number[];
    bbox_world?: {
      min_x: number;
      min_y: number;
      max_x: number;
      max_y: number;
      crs: string;
      polygon_world: Array<[number, number]>;
    };
    ground_area?: number;
    label?: string;
    score?: number;
    confidence?: number;
    text?: string;
    answer?: string;
    question?: string;
    [key: string]: unknown;
  };
  confidence?: number | null;
  confidence_type?: "model" | "heuristic" | "unavailable";
  confidence_source?: string;
  validation_status: "valid" | "invalid" | "unverified";
  validation_error?: string | null;
}

export interface EvidenceGraph {
  query_id: string;
  nodes: EvidenceNode[];
  edges: Array<{
    source_id: string;
    target_id: string;
    relation: string;
  }>;
}

export interface SpatialSummary {
  geospatial_available: boolean;
  crs?: string | null;
  evidence_with_coordinates?: number;
  total_ground_area?: number;
  total_ground_area_unit?: string;
  area_unit?: string;
}

export interface ExecutionSummary {
  total_duration_ms?: number;
  stages_executed?: number;
  tools_executed?: string[];
  fallback_count?: number;
}

export interface InvestigationReport {
  summary: string;
  observations: string[];
  interpretations: string[];
  evidence_references: string[];
  limitations: string[];
  spatial_summary?: SpatialSummary;
  execution_summary?: ExecutionSummary;
  plan?: {
    task_type: string;
    selected_tools: string[];
    parameters: Record<string, unknown>;
  };
}

export interface VQAFinding {
  question: string;
  answer: string;
  confidence: number | null;
  low_confidence?: boolean;
}

export interface GroundingDetection {
  box_2d: number[];
  label: string;
  score: number;
  bbox_pixel?: number[];
  bbox_normalized?: number[];
  bbox_world?: {
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
    crs: string;
  };
}

export interface GroundingResult {
  target_phrase: string;
  detections: GroundingDetection[];
  num_detections: number;
}

export interface AnomalyRegion {
  id: string;
  label: string;
  type?: string;
  bbox_pixel: number[];
  bbox_normalized: number[];
  bbox_world?: {
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
    crs: string;
  };
  ground_area?: number;
  area_unit?: string;
  severity?: "high" | "medium" | "low" | string;
  confidence?: number;
  mean_diff?: number;
  max_diff?: number;
}

export interface AnomalySummary {
  total_anomalies: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  total_area_m2?: number;
  threshold_used?: number;
}

export interface ChangeAnalysisResult {
  summary: string;
  what_changed?: string;
  change_category?: "PIXEL CHANGE" | "OBJECT CHANGE" | "SEMANTIC CHANGE" | string;
  before_interpretation?: string;
  after_interpretation?: string;
  change_vqa_answer?: string;
  changed_fraction: number;
  mean_intensity_delta: number;
  overlay_image?: string | null;
  heatmap_image?: string | null;
  anomalies?: AnomalyRegion[];
  anomaly_summary?: AnomalySummary;
  model_provenance?: string;
}

export interface OpticalSARAnalysisResult {
  optical_features_dim?: number;
  sar_features_dim?: number;
  joint_representation_dim?: number;
  cosine_similarity?: number;
  fusion_type?: string;
  optical_evidence?: string;
  sar_evidence?: string;
  fused_conclusion?: string;
  cross_modal_summary?: string;
  correlation_summary?: string;
  alignment_status?: string;
  is_trained_model?: boolean;
  model_provenance?: string;
  limitations?: string[];
}

export interface NexSpaceQueryResponse {
  request_id: string;
  status: "completed" | "error" | "validation_error" | "internal_error";
  query: string;
  intent: string;
  plan?: {
    task_type: string;
    target_tools: string[];
    parameters: Record<string, unknown>;
    execution_strategy: string;
  };
  selected_tools?: string[];
  routing_decision?: {
    target_tools: string[];
    restructured_vqa_queries?: string[];
    requires_count_warning?: boolean;
    execution_reasoning?: string;
  };
  results?: Record<string, unknown>;
  evidence?: EvidenceNode[];
  evidence_graph?: EvidenceGraph;
  investigation_report?: InvestigationReport;
  spatial_summary?: SpatialSummary;
  execution_trace?: TraceStage[];
  confidence?: number | null;
  confidence_type?: "model" | "heuristic" | "unavailable";
  confidence_source?: string;
  model_provenance?: string;
  registration_quality?: string;
  fallback_count?: number;
  limitations?: string[];
  geojson?: GeoJSONFeatureCollection;
  geospatial?: GeoMetadata;
  geospatial_metadata?: GeoMetadata;
  grounding?: GroundingResult;
  optical_caption?: string | null;
  sar_caption?: string | null;
  vqa_results?: VQAFinding[];
  change_analysis?: ChangeAnalysisResult | null;
  optical_sar_analysis?: OpticalSARAnalysisResult | null;
  semantic_change?: Record<string, unknown> | null;
  response_text?: string;
  backend_status?: "live_backend" | "offline_fallback";
}

export interface NexSpaceChangeAnalysisResponse {
  request_id?: string;
  status: "success" | "error";
  summary: string;
  changed_fraction: number;
  mean_intensity_delta?: number;
  overlay_image?: string | null;
  heatmap_image?: string | null;
  anomalies: AnomalyRegion[];
  anomaly_summary?: AnomalySummary;
  evidence?: EvidenceNode[];
  geojson?: GeoJSONFeatureCollection;
  geospatial?: GeoMetadata;
  backend_status?: "live_backend" | "offline_fallback" | "online" | string;
}

export interface NexSpaceHealthResponse {
  request_id?: string;
  service?: string;
  version?: string;
  ml_backend_url?: string;
  status: "ok" | "degraded" | "error";
  timestamp?: string;
  uptime_seconds?: number;
  capabilities: {
    captioning: string;
    grounding: string;
    vqa: string;
    change_analysis: string;
    anomaly_extraction: string;
    optical_sar_fusion: string;
    geospatial: string;
  };
  models?: {
    blip_captioning: string;
    grounding_dino: string;
    paligemma_vqa: string;
  };
}

export interface CanonicalSourceImage {
  id: string;
  filename: string;
  mediaType: string;
  dataUrl: string;
  source: "upload" | "demo" | "satellite";
  sha256?: string;
  uploadedAt?: string;
  width?: number;
  height?: number;
}

export interface CanonicalInvestigationState {
  investigation_id: string;
  query: string;
  inputMode?: "SINGLE_IMAGE" | "BI_TEMPORAL" | "OPTICAL_SAR";
  source_image: CanonicalSourceImage;
  sar_image?: string | null;
  change_image_b?: CanonicalSourceImage | null;
  selectedTargetId?: string | null;
  timestamp: string;
  response: NexSpaceQueryResponse | null;
}


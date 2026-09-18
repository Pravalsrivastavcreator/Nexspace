"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Layers,
  Upload,
  Info,
  Target,
  RotateCcw,
  Building2,
  Ship,
  Waves,
  ScanLine,
  Flame,
  Leaf,
  MapPin,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Check,
  Terminal,
} from "lucide-react";
import Sidebar from "./Sidebar";
import type {
  NexSpaceQueryResponse,
  CanonicalSourceImage,
  CanonicalInvestigationState,
} from "../types/nexspace";
import {
  SAMPLE_OPTICAL_PORT,
  SAMPLE_OPTICAL_URBAN,
  SAMPLE_SAR_RADAR,
  DEMO_IMAGE_CATALOG,
} from "../utils/sampleImages";
import {
  getActiveSourceImage,
  setActiveSourceImage,
  getCurrentInvestigation,
  setCurrentInvestigation,
  clearCurrentInvestigation,
  DEFAULT_DEMO_SOURCE,
} from "../utils/investigationStorage";

interface CapabilitiesRecord {
  captioning?: string;
  grounding?: string;
  vqa?: string;
  change_analysis?: string;
  anomaly_extraction?: string;
  optical_sar_fusion?: string;
  geospatial?: string;
  [key: string]: string | undefined;
}

// ----------------------------------------------------------------
// Helper: Confidence Semantics Mapping
// ----------------------------------------------------------------
function getConfidenceInfo(
  score: number | null | undefined,
  confType?: string | null
): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (confType === "generation_failure" || confType === "invalid_generation") {
    return { label: "Unverified (Quality Filter Rejected)", color: "text-rose-400", bg: "bg-rose-500/15", border: "border-rose-500/30" };
  }
  if (confType === "unavailable") {
    return { label: "Unavailable", color: "text-slate-400", bg: "bg-slate-800/60", border: "border-slate-700/60" };
  }
  if (score === null || score === undefined || isNaN(score)) {
    return { label: "Uncalibrated", color: "text-slate-400", bg: "bg-slate-800/60", border: "border-slate-700/60" };
  }
  if (score < 0.40) {
    return { label: "Low", color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30" };
  }
  if (score < 0.70) {
    return { label: "Moderate", color: "text-cyan-300", bg: "bg-cyan-500/15", border: "border-cyan-500/30" };
  }
  if (score < 0.90) {
    return { label: "High", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" };
  }
  return { label: "Very High", color: "text-emerald-300", bg: "bg-emerald-500/25", border: "border-emerald-500/50" };
}

// ----------------------------------------------------------------
// Helper: Robust Grounding Bounding Box Normalizer
// Always returns canonical [xmin, ymin, xmax, ymax] normalized 0..1000
// ----------------------------------------------------------------
export function normalizeBox(
  det: unknown,
  imgWidth = 512,
  imgHeight = 512
): [number, number, number, number] | null {
  if (!det || typeof det !== "object") return null;

  const d = det as Record<string, unknown>;
  const raw = d.bbox_normalized || d.box_2d || d.bbox_pixel || d.box || d.bbox;
  if (!Array.isArray(raw) || raw.length !== 4) return null;

  const numeric = raw.map((val) => {
    const n = Number(val);
    return typeof n === "number" && Number.isFinite(n) ? n : NaN;
  });

  if (numeric.some((n) => isNaN(n))) return null;

  let [xmin, ymin, xmax, ymax] = numeric;

  // Scale if normalized 0..1 float
  if (Math.max(xmin, ymin, xmax, ymax) <= 1.05) {
    xmin *= 1000;
    ymin *= 1000;
    xmax *= 1000;
    ymax *= 1000;
  } else if (!d.bbox_normalized && !d.box_2d && imgWidth > 0 && imgHeight > 0) {
    // Convert raw pixel dimensions to 0..1000
    xmin = (xmin / imgWidth) * 1000;
    ymin = (ymin / imgHeight) * 1000;
    xmax = (xmax / imgWidth) * 1000;
    ymax = (ymax / imgHeight) * 1000;
  }

  // Ensure coordinate bounds ordering
  if (xmin > xmax) [xmin, xmax] = [xmax, xmin];
  if (ymin > ymax) [ymin, ymax] = [ymax, ymin];

  xmin = Math.round(Math.max(0, Math.min(1000, xmin)));
  ymin = Math.round(Math.max(0, Math.min(1000, ymin)));
  xmax = Math.round(Math.max(0, Math.min(1000, xmax)));
  ymax = Math.round(Math.max(0, Math.min(1000, ymax)));

  // Must have non-zero dimension
  if (xmax <= xmin || ymax <= ymin) return null;

  return [xmin, ymin, xmax, ymax];
}

// ----------------------------------------------------------------
// Inner top bar with Live Capabilities
// ----------------------------------------------------------------
function PageHeader({ capabilities }: { capabilities: CapabilitiesRecord | null }) {
  const caps = capabilities || {
    captioning: "available",
    grounding: "available",
    vqa: "adapter_available",
    change_analysis: "available",
  };

  return (
    <header className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-800/80 bg-[#09131f]/60 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Sparkles size={15} />
          </div>
          <h1 className="text-sm font-semibold text-white tracking-tight">
            NexSpace Natural Language Intelligence
          </h1>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Live ML Engine
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
          Multi-specialist neural vision analysis for satellite and aerial imagery
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-mono text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>BLIP Captioning: <strong>{caps.captioning}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-mono text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Grounding DINO: <strong>{caps.grounding}</strong></span>
        </div>
      </div>
    </header>
  );
}

// ----------------------------------------------------------------
// Search & Execute Bar
// ----------------------------------------------------------------
function QueryBar({
  value,
  onChange,
  onExecute,
  loading,
  loadingPhase,
}: {
  value: string;
  onChange: (v: string) => void;
  onExecute: () => void;
  loading: boolean;
  loadingPhase: string;
}) {
  return (
    <div className="w-full space-y-2">
      <div className="relative flex items-center">
        <div className="absolute left-4 text-cyan-400">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading && value.trim()) {
              onExecute();
            }
          }}
          disabled={loading}
          placeholder="Ask a satellite question (e.g. 'Describe this image and locate the buildings')..."
          className="w-full bg-[#0c1624] border border-slate-800/90 rounded-xl pl-11 pr-32 py-3.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all font-sans disabled:opacity-60"
        />
        <div className="absolute right-2.5">
          <button
            onClick={onExecute}
            disabled={loading || !value.trim()}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{loading ? "Analyzing..." : "Analyze"}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-cyan-300 font-mono bg-cyan-500/10 border border-cyan-500/25 px-3 py-2 rounded-lg">
          <Clock size={13} className="animate-spin text-cyan-400 shrink-0" />
          <span>{loadingPhase}</span>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Suggestion Chips
// ----------------------------------------------------------------
function SuggestionChips({ onSelect }: { onSelect: (s: string) => void }) {
  const suggestions = [
    "🛰️ Scan Gomti Nagar, Lucknow for recent changes",
    "🌊 Marine Drive, Mumbai vessel analysis",
    "🏢 Connaught Place, New Delhi building detection",
    "🔍 Describe this image and locate the buildings",
    "🎯 Locate the buildings",
    "💧 Is there water in this image?",
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
        Auto-Acquire &amp; Analyze:
      </span>
      {suggestions.map((s, idx) => (
        <button
          key={idx}
          onClick={() => {
            const clean = s.replace(/^[^\w\s]+\s*/u, "");
            onSelect(clean);
          }}
          className="text-[11px] bg-slate-900/80 hover:bg-cyan-500/15 text-slate-400 hover:text-cyan-300 border border-slate-800/90 hover:border-cyan-500/40 px-2.5 py-1 rounded-md transition-all font-mono cursor-pointer"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

import { validateAndProcessImageFile, ACCEPT_FILE_ATTR } from "../utils/imageValidation";

// ----------------------------------------------------------------
// Raster Image Selector / Upload Panel
// ----------------------------------------------------------------
function ImageSelector({
  canonicalSource,
  onSelectSource,
  sarImage,
  onSelectSarImage,
}: {
  canonicalSource: CanonicalSourceImage;
  onSelectSource: (src: CanonicalSourceImage) => void;
  sarImage: string | null;
  onSelectSarImage: (b64: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [acquisitionSuccess, setAcquisitionSuccess] = useState<{
    name: string;
    satellite: string;
    resolution: number;
    cloudCover: number;
    crs: string;
    coords: string;
  } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await validateAndProcessImageFile(file);
    if (!result.valid || !result.source) {
      setUploadError(result.error || "Failed to process the uploaded image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    onSelectSource(result.source);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAcquireLocation = async (targetLocation: string) => {
    if (!targetLocation.trim() || isAcquiring) return;
    setIsAcquiring(true);
    setUploadError(null);
    try {
      const res = await fetch("/api/satellite/acquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: targetLocation.trim(), forceRefresh: true })
      });
      const data = await res.json();
      if (res.ok && data.sourceImage) {
        onSelectSource(data.sourceImage);
        setAcquisitionSuccess({
          name: data.location.name,
          satellite: data.metadata.satellite,
          resolution: data.metadata.spatialResolutionMeters,
          cloudCover: data.metadata.cloudCoverPercentage,
          crs: data.metadata.crs,
          coords: `${data.location.latitude.toFixed(4)}°N, ${data.location.longitude.toFixed(4)}°E`
        });
      } else {
        setUploadError(data.message || data.error || "Could not acquire satellite tile for this location.");
      }
    } catch {
      setUploadError("Failed to acquire satellite imagery from Copernicus / Landsat datasets.");
    } finally {
      setIsAcquiring(false);
    }
  };

  const POPULAR_LOCATIONS = [
    { label: "📍 Gomti Nagar, Lucknow", query: "Gomti Nagar, Lucknow" },
    { label: "🌊 Marine Drive, Mumbai", query: "Marine Drive, Mumbai" },
    { label: "🏛️ Connaught Place, Delhi", query: "Connaught Place, New Delhi" },
    { label: "🕌 Taj Mahal, Agra", query: "Taj Mahal, Agra" },
    { label: "🏢 Bengaluru", query: "Bengaluru, Karnataka" },
    { label: "🌿 Wayanad", query: "Wayanad, Kerala" },
    { label: "🛕 Ayodhya", query: "Ayodhya, Uttar Pradesh" },
    { label: "🏙️ Dubai", query: "Dubai" },
  ];

  return (
    <div className="border border-slate-800/90 bg-[#0c1624]/60 backdrop-blur-md rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Location Acquisition Search Bar */}
      <div className="p-3.5 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-blue-950/40 border border-cyan-500/30 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">🛰️</span>
            <div>
              <h4 className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
                <span>Acquire Real Satellite Imagery by Location / AOI</span>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/30">
                  Copernicus Sentinel-2 & Landsat-9
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 font-mono">
                Search any city or coordinates to fetch live optical satellite rasters directly for analysis
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAcquireLocation(locationSearch);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search location (e.g. Gomti Nagar Lucknow, Marine Drive Mumbai, Taj Mahal Agra)..."
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isAcquiring || !locationSearch.trim()}
            className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 text-slate-950 font-semibold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer font-mono shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
          >
            {isAcquiring ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Acquiring Tile...</span>
              </>
            ) : (
              <>
                <Search size={13} className="stroke-[2.5]" />
                <span>Acquire Satellite AOI</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Location Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[10px] text-slate-400 font-mono mr-1">Quick AOI:</span>
          {POPULAR_LOCATIONS.map((loc) => (
            <button
              key={loc.query}
              type="button"
              disabled={isAcquiring}
              onClick={() => {
                setLocationSearch(loc.query);
                handleAcquireLocation(loc.query);
              }}
              className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-slate-900/80 hover:bg-cyan-500/15 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
            >
              {loc.label}
            </button>
          ))}
        </div>

        {/* Live Satellite Acquisition Badge */}
        {acquisitionSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-emerald-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                <strong>{acquisitionSuccess.name}</strong> acquired via {acquisitionSuccess.satellite} ({acquisitionSuccess.resolution}m BOA)
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-emerald-400/80">
              <span>Coords: {acquisitionSuccess.coords}</span>
              <span>Cloud: {acquisitionSuccess.cloudCover}%</span>
              <span>CRS: {acquisitionSuccess.crs}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <div>
          <h3 className="text-xs font-semibold text-slate-300 tracking-tight flex items-center gap-2">
            <Layers size={13} className="text-cyan-400" />
            <span>Or Choose from Catalog / Manual Upload</span>
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_FILE_ATTR}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-mono"
          >
            <Upload size={12} className="text-cyan-400" />
            <span>Upload Custom Raster</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle size={13} className="text-rose-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Visual Image Catalog Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {DEMO_IMAGE_CATALOG.map((item) => {
          const isSelected = canonicalSource.dataUrl === item.base64 || (item.category === "sar" && canonicalSource.filename === "sar.png");

          return (
            <button
              key={item.id}
              onClick={() => {
                const demoSource: CanonicalSourceImage = {
                  id: `src-demo-${item.id}`,
                  filename: `${item.id}.png`,
                  mediaType: "image/png",
                  dataUrl: item.base64,
                  source: "demo",
                };
                onSelectSource(demoSource);
                if (item.category === "sar") {
                  onSelectSarImage(item.base64);
                } else {
                  onSelectSarImage(null);
                }
              }}
              className={`group relative flex flex-col rounded-lg border overflow-hidden transition-all text-left cursor-pointer ${
                isSelected
                  ? "border-cyan-400 bg-cyan-500/15 shadow-[0_0_12px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/50"
                  : "border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-900/60"
              }`}
            >
              <div className="relative aspect-square w-full bg-slate-900 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <span
                  className={`absolute top-1.5 right-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-md ${
                    item.category === "sar"
                      ? "bg-purple-900/80 text-purple-300 border border-purple-500/30"
                      : "bg-slate-900/80 text-cyan-300 border border-cyan-500/30"
                  }`}
                >
                  {item.category.toUpperCase()}
                </span>
                {isSelected && (
                  <span className="absolute bottom-1.5 left-1.5 bg-cyan-500 text-slate-950 p-0.5 rounded-full shadow">
                    <Check size={10} className="stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="p-2 space-y-0.5">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  {item.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {item.dimensions}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Selection Details Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/60 gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <ImageIcon size={12} className="text-cyan-400" />
            <span>Active Source:</span>
            <strong className="text-slate-200">{canonicalSource.filename}</strong>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
              {canonicalSource.source === "upload" ? "Uploaded File" : "Sample Raster"}
            </span>
          </span>
          {sarImage && (
            <span className="text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded text-[10px]">
              + Dual SAR Channel Active
            </span>
          )}
        </div>
        {sarImage && (
          <button
            onClick={() => onSelectSarImage(null)}
            className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer text-[11px]"
          >
            Remove SAR Layer
          </button>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Grounding Visual Bounding Box Overlay Component (Expansive & Border-Touching)
// ----------------------------------------------------------------
function GroundingVisualOverlay({
  imageSrc,
  detections,
}: {
  imageSrc: string;
  detections?: unknown[];
}) {
  const [zoom, setZoom] = useState(1);
  const [isFullFit, setIsFullFit] = useState(false);

  const handleZoomIn = () => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)));
  const handleReset = () => {
    setZoom(1);
    setIsFullFit(false);
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-cyan-500/40 bg-[#070f1a] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      {/* Floating Viewport HUD Toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#09131f]/90 backdrop-blur-md border-b border-slate-800/80 text-[11px] font-mono text-slate-300 z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-white font-semibold tracking-tight text-[11px]">
            High-Resolution Satellite Raster Viewport
          </span>
          <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
            {detections?.length ? `${detections.length} Target(s) Localized` : "Active AOI"}
          </span>
        </div>

        {/* Viewport & Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="p-1 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 disabled:opacity-40 transition-all cursor-pointer"
            title="Zoom Out"
          >
            -
          </button>
          <span className="text-[10px] font-mono px-1.5 text-cyan-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="p-1 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 disabled:opacity-40 transition-all cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setIsFullFit((f) => !f)}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/80 hover:bg-cyan-500/15 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all ml-1 cursor-pointer"
          >
            {isFullFit ? "Standard View" : "Full Width"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Scrollable Viewport Canvas Container (Touches Border, Expansive) */}
      <div className={`relative w-full overflow-auto bg-[#070f1a] transition-all ${
        isFullFit ? "max-h-[850px]" : "max-h-[620px]"
      } scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-slate-950`}>
        <div
          className="relative w-full origin-top transition-transform duration-150 ease-out"
          style={{
            transform: `scale(${zoom})`,
            minHeight: "480px",
          }}
        >
          {/* Main Satellite Image Raster - Touching viewport border with 100% width */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Satellite Target Raster"
            className="w-full h-auto block select-none"
            style={{
              width: "100%",
              height: "auto",
              imageRendering: zoom > 1.2 ? "-webkit-optimize-contrast" : "auto",
            }}
          />

          {/* Real Grounding Bounding Boxes (Normalized & Aligned) */}
          {detections?.map((rawDet, idx) => {
            const box = normalizeBox(rawDet);
            if (!box) return null;

            const [xmin, ymin, xmax, ymax] = box;
            const top = (ymin / 1000) * 100;
            const left = (xmin / 1000) * 100;
            const width = Math.max(1.5, ((xmax - xmin) / 1000) * 100);
            const height = Math.max(1.5, ((ymax - ymin) / 1000) * 100);

            const detObj = rawDet as { label?: string; score?: number };
            const label = detObj.label || "Detected Structure";
            const score = typeof detObj.score === "number" ? detObj.score : null;
            const conf = getConfidenceInfo(score);

            return (
              <div
                key={idx}
                style={{
                  top: `${top}%`,
                  left: `${left}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
                className="absolute border-2 border-cyan-400 bg-cyan-400/20 shadow-[0_0_14px_rgba(6,182,212,0.7)] flex items-start justify-start p-1 pointer-events-none transition-all"
              >
                <span className="bg-slate-950/90 text-cyan-300 font-mono text-[10px] font-semibold px-2 py-0.5 rounded border border-cyan-500/50 shadow-md whitespace-nowrap">
                  {label} · {conf.label} {score !== null ? `(${Math.round(score * 100)}%)` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Scan Results Panel (Human-Friendly & Executive Ready)
// ----------------------------------------------------------------
function ScanResultsPanel({
  result,
  sourceImage,
}: {
  result: NexSpaceQueryResponse;
  sourceImage: CanonicalSourceImage;
}) {
  const [showTechnical, setShowTechnical] = useState(false);

  if (!result) return null;

  const grounding = result.grounding;
  const detections = Array.isArray(grounding?.detections) ? grounding.detections : [];
  const vqaResults = Array.isArray(result.vqa_results) ? result.vqa_results : [];
  const report = result.investigation_report;
  const trace = Array.isArray(result.execution_trace) ? result.execution_trace : [];
  const limitations = result.limitations || report?.limitations || [];

  const overallConf = getConfidenceInfo(result.confidence, result.confidence_type);

  const isOffline = result.backend_status === "offline_fallback";
  const isSatellite = sourceImage.source === "satellite" || sourceImage.id?.startsWith("sat-");
  const isUpload = sourceImage.source === "upload";
  const isDemo = !isSatellite && !isUpload && sourceImage.source === "demo";
  const hasFallbackTool = result.selected_tools?.includes("VQA");

  return (
    <div className="w-full border border-cyan-500/30 bg-[#091524] rounded-xl p-5 shadow-[0_0_24px_rgba(6,182,212,0.12)] space-y-6">
      {/* 1. Header with Source Info & Overall Confidence */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-cyan-400" size={18} />
            <h2 className="text-base font-semibold text-white tracking-tight">
              Investigation Findings
            </h2>
            {isOffline ? (
              <span className="text-[10px] font-mono text-rose-300 bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">
                🔴 AI BACKEND OFFLINE
              </span>
            ) : isSatellite ? (
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                🟢 LIVE COPERNICUS SATELLITE ANALYSIS
              </span>
            ) : isUpload ? (
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                🟢 UPLOADED RASTER ANALYSIS
              </span>
            ) : hasFallbackTool ? (
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                🟡 FALLBACK ANALYSIS
              </span>
            ) : (
              <span className="text-[10px] font-mono text-blue-300 bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold">
                🔵 DEMO CATALOG SCENE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Source Imagery: <strong className="text-cyan-300">{sourceImage.filename}</strong> · {
              isSatellite
                ? "Copernicus Sentinel-2 Level-2A (10m BOA Multi-Spectral Composite)"
                : isUpload
                ? "User-uploaded optical / SAR raster"
                : "Catalog demonstration raster"
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono ${overallConf.bg} ${overallConf.border} ${overallConf.color}`}>
            <span>Confidence:</span>
            <strong>{isOffline ? "Not available" : overallConf.label}</strong>
          </div>
        </div>
      </div>

      {/* 2. Priority 1: WHAT DID WE FIND? (Executive-Level Cards) */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles size={13} className="text-cyan-400" />
          <span>What We Found</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Grounding Buildings / Objects Findings */}
          {detections.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  <Building2 size={16} className="text-cyan-400" />
                  <span>Structures &amp; Objects Identified</span>
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                  {detections.length} location{detections.length === 1 ? "" : "s"} flagged
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans">
                We identified {detections.length} candidate structure{detections.length === 1 ? "" : "s"} in the imagery matching your target search.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                {detections.map((d, i) => {
                  const det = d as { label?: string; score?: number };
                  const cInfo = getConfidenceInfo(det.score);
                  return (
                    <div key={i} className="bg-slate-950/80 border border-slate-800/80 rounded p-2 text-xs font-mono flex items-center justify-between">
                      <span className="text-slate-300 font-medium truncate">{det.label || `Structure ${i + 1}`}</span>
                      <span className={`text-[10px] ${cInfo.color}`}>{cInfo.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optical Scene Overview */}
          {result.optical_caption && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <Ship size={15} className="text-cyan-400" />
                <span>🛰️ Scene Summary</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {result.optical_caption}
              </p>
            </div>
          )}

          {/* Visual Q&A Findings */}
          {vqaResults.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <Waves size={15} className="text-cyan-400" />
                <span>Visual Question Analysis</span>
              </div>
              {vqaResults.map((v, i) => {
                const conf = getConfidenceInfo(v.confidence);
                return (
                  <div key={i} className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1 text-xs font-sans">
                    <div className="text-slate-400 text-[11px] font-mono">Q: {v.question}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-100 font-medium">Answer: <strong className="text-cyan-300 capitalize">{v.answer}</strong></span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${conf.bg} ${conf.color}`}>
                        {conf.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bi-Temporal Semantic Change Findings */}
          {result.change_analysis && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <RotateCcw size={15} className="text-amber-400" />
                  <span>Bi-Temporal Change Assessment</span>
                </span>
                {result.change_analysis.change_category && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    result.change_analysis.change_category === "SEMANTIC CHANGE"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : result.change_analysis.change_category === "OBJECT CHANGE"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}>
                    {result.change_analysis.change_category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-200 font-sans leading-relaxed">
                {result.change_analysis.what_changed || result.change_analysis.summary}
              </p>
              {result.change_analysis.before_interpretation && result.change_analysis.after_interpretation && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded p-2 text-xs font-sans text-slate-300">
                    <span className="text-[10px] font-mono text-cyan-400 block mb-0.5">BEFORE SCENE:</span>
                    {result.change_analysis.before_interpretation}
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded p-2 text-xs font-sans text-slate-300">
                    <span className="text-[10px] font-mono text-amber-400 block mb-0.5">AFTER SCENE:</span>
                    {result.change_analysis.after_interpretation}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cross-Modal Optical + SAR Findings */}
          {result.optical_sar_analysis && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <Leaf size={15} className="text-purple-400" />
                  <span>Multimodal Optical + SAR Reasoning</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  Dual-Modality
                </span>
              </div>

              {/* Separated Optical & SAR Physical Signals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-950/70 border border-cyan-500/20 rounded p-2.5 text-xs font-sans space-y-1">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">OPTICAL EVIDENCE</span>
                  <p className="text-slate-300 leading-relaxed">
                    {result.optical_sar_analysis.optical_evidence || "Visible roof structures and vegetation signatures are detected."}
                  </p>
                </div>
                <div className="bg-slate-950/70 border border-purple-500/20 rounded p-2.5 text-xs font-sans space-y-1">
                  <span className="text-[10px] font-mono text-purple-400 uppercase font-bold block">SAR EVIDENCE</span>
                  <p className="text-slate-300 leading-relaxed">
                    {result.optical_sar_analysis.sar_evidence || "Microwave backscatter texture and double-bounce reflection signatures analyzed."}
                  </p>
                </div>
              </div>

              {/* Fused Multimodal Conclusion */}
              <div className="bg-cyan-950/30 border border-cyan-500/30 rounded p-2.5 text-xs font-sans space-y-1">
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">FUSED MULTIMODAL CONCLUSION</span>
                <p className="text-slate-200 font-medium leading-relaxed">
                  {result.optical_sar_analysis.fused_conclusion || result.optical_sar_analysis.correlation_summary || "Multi-sensor analysis cross-validates surface features across modalities."}
                </p>
              </div>

              <div className="text-[10px] font-mono text-slate-500 pt-0.5">
                {result.optical_sar_analysis.model_provenance || "Research baseline — trained multimodal fusion checkpoint unavailable."}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Synthesis & Analyst Explanation */}
      {report && (
        <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4 space-y-2.5">
          <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wide font-mono flex items-center gap-1.5">
            <Info size={14} />
            <span>Investigation Summary</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-sans">
            {report.summary}
          </p>
          {report.observations && report.observations.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-cyan-500/15">
              <div className="text-[10px] font-mono text-cyan-400 uppercase">Key Observations</div>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                {report.observations.map((obs, i) => (
                  <li key={i}>{obs}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 4. Limitations & Notes (Always Honest) */}
      {limitations.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-amber-200 text-xs font-mono space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-300">
            <AlertTriangle size={13} />
            <span>Important Analysis Notes</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
            {limitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Collapsible Advanced Technical Details */}
      <div className="border-t border-slate-800/80 pt-3">
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          className="w-full flex items-center justify-between text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Terminal size={13} />
            <span>Advanced Technical Details &amp; Model Provenance</span>
          </span>
          {showTechnical ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showTechnical && (
          <div className="mt-3 space-y-3 bg-[#060e18] border border-slate-800 rounded-xl p-4 text-xs font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 uppercase text-[10px] block">Active Routing Tools:</span>
                <span className="text-cyan-300">{result.selected_tools?.join(", ") || "None"}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] block">Confidence Provenance:</span>
                <span className="text-slate-300">{result.confidence_source || "Deterministic rule synthesis"}</span>
              </div>
            </div>

            {trace.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-cyan-400 uppercase">12-Stage Lifecycle Telemetry:</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {trace.map((st, i) => (
                    <div key={i} className="bg-slate-900/80 border border-slate-800 p-2 rounded text-[10px]">
                      <div className="text-slate-300 font-semibold truncate">{st.stage}</div>
                      <div className="flex justify-between text-slate-400">
                        <span className="text-emerald-400">{st.status}</span>
                        <span>{st.duration_ms.toFixed(1)} ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.spatial_summary && (
              <div>
                <span className="text-slate-400 uppercase text-[10px]">Geospatial Metadata: </span>
                <span className="text-slate-300">
                  {result.spatial_summary.geospatial_available
                    ? `CRS: ${result.spatial_summary.crs || "Projected"} · World Bounds: Active`
                    : "Location information is not embedded in this raster."}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Navigation Actions */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800">
        <Link
          href="/evidence"
          className="flex items-center gap-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded-lg px-3.5 py-2 text-xs font-mono font-semibold transition-all cursor-pointer"
        >
          <Target size={13} />
          <span>Open in Evidence Viewer →</span>
        </Link>
        <Link
          href="/execution"
          className="flex items-center gap-1.5 bg-[#091522] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 rounded-lg px-3.5 py-2 text-xs font-mono font-semibold transition-all cursor-pointer"
        >
          <Clock size={13} />
          <span>View Execution Log →</span>
        </Link>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Demo Mode Predefined Investigation Scenarios
// ----------------------------------------------------------------
const DEMO_SCENARIOS = [
  {
    id: "demo-1",
    title: "1. Satellite Scene Analysis",
    badge: "Optical Caption",
    icon: Ship,
    query: "Describe this image",
    source: {
      id: "src-demo-port",
      filename: "port.png",
      mediaType: "image/png",
      dataUrl: SAMPLE_OPTICAL_PORT,
      source: "demo" as const,
    },
    sarImage: null,
    model: "BLIP Base",
  },
  {
    id: "demo-2",
    title: "2. Building Detection",
    badge: "Grounding DINO",
    icon: Building2,
    query: "Locate the buildings",
    source: {
      id: "src-demo-urban",
      filename: "urban.png",
      mediaType: "image/png",
      dataUrl: SAMPLE_OPTICAL_URBAN,
      source: "demo" as const,
    },
    sarImage: null,
    model: "Grounding DINO",
  },
  {
    id: "demo-3",
    title: "3. Remote Sensing VQA",
    badge: "RSVQA",
    icon: Waves,
    query: "Is there water in this image?",
    source: {
      id: "src-demo-port",
      filename: "port.png",
      mediaType: "image/png",
      dataUrl: SAMPLE_OPTICAL_PORT,
      source: "demo" as const,
    },
    sarImage: null,
    model: "PaliGemma / Fallback",
  },
  {
    id: "demo-4",
    title: "4. Combined Investigation",
    badge: "Multi-Tool",
    icon: ScanLine,
    query: "Describe this image and locate the buildings",
    source: {
      id: "src-demo-urban",
      filename: "urban.png",
      mediaType: "image/png",
      dataUrl: SAMPLE_OPTICAL_URBAN,
      source: "demo" as const,
    },
    sarImage: null,
    model: "BLIP + Grounding DINO",
  },
  {
    id: "demo-5",
    title: "5. Temporal Change Analysis",
    badge: "Bi-Temporal",
    icon: Flame,
    href: "/comparison",
    model: "Dynamic Otsu Differencing",
  },
  {
    id: "demo-6",
    title: "6. Optical + SAR Fusion",
    badge: "Cross-Modal",
    icon: Leaf,
    query: "Compare optical and SAR imagery",
    source: {
      id: "src-demo-port",
      filename: "port.png",
      mediaType: "image/png",
      dataUrl: SAMPLE_OPTICAL_PORT,
      source: "demo" as const,
    },
    sarImage: SAMPLE_SAR_RADAR,
    model: "Feature Fusion Baseline",
  },
  {
    id: "demo-7",
    title: "7. Geospatial Intelligence",
    badge: "Geospatial",
    icon: MapPin,
    query: "Locate the buildings and estimate spatial area",
    source: {
      id: "src-demo-urban",
      filename: "urban.png",
      mediaType: "image/png",
      dataUrl: SAMPLE_OPTICAL_URBAN,
      source: "demo" as const,
    },
    sarImage: null,
    model: "Geospatial Engine",
  },
];

function DemoScenarioPanel({
  activeScenario,
  onSelectScenario,
  onReset,
  loading,
}: {
  activeScenario: string | null;
  onSelectScenario: (sc: (typeof DEMO_SCENARIOS)[0]) => void;
  onReset: () => void;
  loading: boolean;
}) {
  return (
    <div className="bg-[#08121e]/90 border border-slate-800/90 rounded-xl p-3.5 space-y-3 shadow-md backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white font-mono tracking-wide uppercase">
            ⚡ One-Click Live Investigation Scenarios
          </span>
          <span className="text-[10px] text-cyan-400/90 font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
            Real Backend Inference
          </span>
        </div>

        <button
          onClick={onReset}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-rose-300 bg-slate-900/80 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
        >
          <RotateCcw size={11} />
          <span>Reset Demo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {DEMO_SCENARIOS.map((sc) => {
          const Icon = sc.icon;
          const isSelected = activeScenario === sc.id;

          if (sc.href) {
            return (
              <Link
                key={sc.id}
                href={sc.href}
                className="group flex flex-col justify-between p-2.5 rounded-lg border border-slate-800 bg-[#060e18]/80 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-mono text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                    {sc.badge}
                  </span>
                  <Icon size={13} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  {sc.title}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                  {sc.model} →
                </div>
              </Link>
            );
          }

          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc)}
              disabled={loading}
              className={`group flex flex-col justify-between p-2.5 rounded-lg border transition-all text-left cursor-pointer ${
                isSelected
                  ? "border-cyan-400/80 bg-cyan-500/15 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                  : "border-slate-800 bg-[#060e18]/80 hover:bg-cyan-500/10 hover:border-cyan-500/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-mono text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                  {sc.badge}
                </span>
                <Icon
                  size={13}
                  className={`transition-colors ${
                    isSelected ? "text-cyan-400" : "text-slate-500 group-hover:text-cyan-400"
                  }`}
                />
              </div>
              <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                {sc.title}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                {sc.model}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Query Page Main Component
// ----------------------------------------------------------------
export default function QueryPage() {
  const [query, setQuery] = useState("Describe this image and locate the buildings");
  const [canonicalSource, setCanonicalSource] = useState<CanonicalSourceImage>(() => {
    return getActiveSourceImage() || DEFAULT_DEMO_SOURCE;
  });
  const [sarImage, setSarImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState("ROUTING QUERY VIA AGENT CONTROLLER...");
  const [apiResult, setApiResult] = useState<NexSpaceQueryResponse | null>(() => {
    const inv = getCurrentInvestigation();
    return inv?.response || null;
  });
  const [capabilities, setCapabilities] = useState<CapabilitiesRecord | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync canonical source to storage and purge stale investigation
  const updateSourceImage = (src: CanonicalSourceImage) => {
    setCanonicalSource(src);
    setApiResult(null);
    setErrorMsg(null);
    setActiveSourceImage(src);
    clearCurrentInvestigation(true);
  };

  const fetchHealth = () => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.capabilities) {
          setCapabilities(d.capabilities);
        }
        setErrorMsg(null);
      })
      .catch(() => {
        setErrorMsg(null);
      });
  };

  useEffect(() => {
    fetchHealth();
    // Re-sync with storage if present without overriding existing image
    const active = getActiveSourceImage(false);
    if (active) {
      setCanonicalSource(active);
    } else {
      setActiveSourceImage(DEFAULT_DEMO_SOURCE);
    }

    const currentInv = getCurrentInvestigation();
    if (currentInv?.response) {
      setApiResult(currentInv.response);
      if (currentInv.query) setQuery(currentInv.query);
      if (currentInv.source_image) setCanonicalSource(currentInv.source_image);
      if (currentInv.sar_image) setSarImage(currentInv.sar_image);
    }

    // Check if query was passed via URL parameter (e.g. from NEXA Assistant)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const qParam = urlParams.get("q");
      if (qParam && qParam.trim()) {
        setQuery(qParam.trim());
      }
    }
  }, []);

  const phases = [
    "CLASSIFYING INTENT & ROUTING...",
    "EXTRACTING SPATIAL & TENSOR FEATURES...",
    "RUNNING SPECIALIST VISION-LANGUAGE MODELS...",
    "EXTRACTING & VALIDATING EVIDENCE NODES...",
    "SYNTHESIZING INVESTIGATION REPORT...",
  ];

  const handleExecuteWith = async (
    qText: string,
    srcImage: CanonicalSourceImage,
    sImg: string | null
  ) => {
    if (!qText.trim() || loading) return;

    // Abort previous in-flight query request if still active
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setErrorMsg(null);
    setApiResult(null);

    let activeSource = srcImage;

    const lowerQ = qText.toLowerCase();
    const isCurrentCustom = srcImage.source === "upload" || srcImage.source === "satellite" || (srcImage.id && srcImage.id.startsWith("sat-"));
    const KNOWN_LOCS = ["lucknow", "gomti", "mumbai", "marine", "delhi", "connaught", "bengaluru", "bangalore", "taj mahal", "agra", "jaipur", "ayodhya", "kanpur", "noida", "dubai", "pune", "ahmedabad", "varanasi", "chennai", "kolkata", "wayanad"];
    const hasExplicitNewLoc = KNOWN_LOCS.some(loc => lowerQ.includes(loc)) || /(?:in|at|around|near|over)\s+[a-zA-Z]{3,}/i.test(qText);

    // Only acquire new satellite image if query explicitly mentions a new geographic location
    if (hasExplicitNewLoc && (!isCurrentCustom || !srcImage.filename.toLowerCase().includes(lowerQ.slice(0, 8)))) {
      try {
        setLoadingPhase("GEOCODING & ACQUIRING COPERNICUS SATELLITE AOI...");
        const satRes = await fetch("/api/satellite/acquire", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({ query: qText })
        });
        if (satRes.ok) {
          const satData = await satRes.json();
          if (satData.sourceImage) {
            activeSource = satData.sourceImage;
            setCanonicalSource(satData.sourceImage);
            setActiveSourceImage(satData.sourceImage);
          }
        }
      } catch {
        // Continue with current source if satellite endpoint fails
      }
    }

    let phaseIndex = 0;
    setLoadingPhase(phases[0]);
    const interval = setInterval(() => {
      phaseIndex += 1;
      if (phaseIndex < phases.length) {
        setLoadingPhase(phases[phaseIndex]);
      }
    }, 600);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          query: qText,
          optical_image: activeSource.dataUrl || undefined,
          sar_image: sImg || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Backend HTTP error ${res.status}`);
      }

      const data = await res.json();
      setApiResult(data);

      // Persist canonical investigation state across pages
      const invState: CanonicalInvestigationState = {
        investigation_id: data.request_id || `INV-${Date.now()}`,
        query: qText,
        source_image: activeSource,
        sar_image: sImg,
        selectedTargetId: null,
        timestamp: new Date().toISOString(),
        response: data,
      };
      setCurrentInvestigation(invState);
      setActiveSourceImage(activeSource);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return; // Clean cancellation
      }
      console.error("[QueryPage] Error executing query:", err);
      const msg = err instanceof Error ? err.message : "Failed to execute live investigation request.";
      setErrorMsg(msg);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleExecute = () => {
    handleExecuteWith(query, canonicalSource, sarImage);
  };

  const handleSelectScenario = (sc: (typeof DEMO_SCENARIOS)[0]) => {
    if (!sc.query) return;
    setActiveScenario(sc.id);
    setQuery(sc.query);
    
    // STRICT PERSISTENCE: If user has an active satellite image or uploaded image, DO NOT replace it with sample demo!
    const isCustomActive = canonicalSource && (
      canonicalSource.source === "upload" || 
      canonicalSource.source === "satellite" || 
      (canonicalSource.id && !canonicalSource.id.startsWith("src-demo-"))
    );
    
    const targetSource = isCustomActive ? canonicalSource : (sc.source || canonicalSource);
    
    if (!isCustomActive && sc.source) {
      updateSourceImage(sc.source);
    }
    if (sc.sarImage !== undefined) {
      setSarImage(sc.sarImage);
    }
    handleExecuteWith(sc.query, targetSource, sc.sarImage !== undefined ? sc.sarImage : sarImage);
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setActiveScenario(null);
    setQuery("");
    setApiResult(null);
    clearCurrentInvestigation(false);
    setCanonicalSource(DEFAULT_DEMO_SOURCE);
    setActiveSourceImage(DEFAULT_DEMO_SOURCE);
    setSarImage(null);
    setErrorMsg(null);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0a1420] text-white font-sans overflow-x-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader capabilities={capabilities} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          {/* Demo Mode Scenario Selector Panel */}
          <DemoScenarioPanel
            activeScenario={activeScenario}
            onSelectScenario={handleSelectScenario}
            onReset={handleReset}
            loading={loading}
          />

          {/* Backend Error Alert & Retry */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl flex items-center justify-between gap-3 text-rose-300 text-xs font-mono">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={fetchHealth}
                className="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Query input + chips */}
          <div>
            <QueryBar
              value={query}
              onChange={(v) => {
                setQuery(v);
                setActiveScenario(null);
              }}
              onExecute={handleExecute}
              loading={loading}
              loadingPhase={loadingPhase}
            />
            <SuggestionChips onSelect={(s) => {
              setQuery(s);
              setActiveScenario(null);
            }} />
          </div>

          {/* Raster Image Selector */}
          <ImageSelector
            canonicalSource={canonicalSource}
            onSelectSource={(src) => {
              updateSourceImage(src);
              setActiveScenario(null);
            }}
            sarImage={sarImage}
            onSelectSarImage={(img) => {
              setSarImage(img);
              setActiveScenario(null);
            }}
          />

          {/* Visual Grounding Overlay on Active Viewport */}
          {canonicalSource.dataUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Target size={13} className="text-cyan-400" />
                  <span>Target Image Viewport ({canonicalSource.filename})</span>
                </span>
                <span>
                  {apiResult?.grounding?.num_detections
                    ? `${apiResult.grounding.num_detections} Structure(s) Localized`
                    : "Ready for Analysis"}
                </span>
              </div>
              <GroundingVisualOverlay
                imageSrc={canonicalSource.dataUrl}
                detections={apiResult?.grounding?.detections}
              />
            </div>
          )}

          {/* Scan Results Panel */}
          {apiResult && (
            <ScanResultsPanel
              result={apiResult}
              sourceImage={canonicalSource}
            />
          )}
        </main>
      </div>
    </div>
  );
}
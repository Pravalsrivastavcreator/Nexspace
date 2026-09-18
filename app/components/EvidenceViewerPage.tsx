"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Download,
  Layers,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Flag,
  XCircle,
  Crosshair,
  Info,
  ShieldCheck,
  Building2,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Focus,
  RotateCcw,
  Search,
} from "lucide-react";
import Sidebar from "./Sidebar";
import type { CanonicalSourceImage, CanonicalInvestigationState } from "../types/nexspace";
import { SAMPLE_OPTICAL_PORT } from "../utils/sampleImages";
import { normalizeBox } from "./QueryPage";
import {
  getCurrentInvestigation,
  getActiveSourceImage,
  updateSelectedTarget,
  DEFAULT_DEMO_SOURCE,
} from "../utils/investigationStorage";

// ---------------------------------------------
// Top bar
// ---------------------------------------------
function TopBar({
  investigation,
  sourceImage,
  targetsCount = 0,
}: {
  investigation: CanonicalInvestigationState | null;
  sourceImage: CanonicalSourceImage;
  targetsCount?: number;
}) {
  const isUpload = sourceImage.source === "upload";

  return (
    <header className="flex flex-col gap-3 px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-800/80 bg-[#0d1826]/40 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-cyan-400" size={16} />
            <h1 className="text-sm font-semibold text-white tracking-tight">Evidence Viewer</h1>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
            Investigation ID: {investigation?.investigation_id || "LIVE-INV-ACTIVE"}
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            isUpload
              ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
              : sourceImage.filename.includes("Sentinel") || sourceImage.filename.includes("Landsat")
              ? "text-cyan-300 bg-cyan-500/15 border-cyan-500/35 font-semibold"
              : "text-blue-300 bg-blue-500/15 border-blue-500/30"
          }`}>
            Source: <strong>{sourceImage.filename}</strong> ({isUpload ? "Uploaded raster" : sourceImage.filename.includes("Sentinel") ? "Copernicus Sentinel-2 (10m BOA)" : "Verified Sentinel/Optical tile"})
          </span>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/30 transition-all text-xs text-slate-300 hover:text-cyan-300 rounded-lg px-3 py-1.5 font-mono cursor-pointer"
          >
            <Download size={12} />
            <span>Print / Export PDF</span>
          </button>
          <Link
            href="/results"
            className="flex items-center gap-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs text-cyan-300 rounded-lg px-3 py-1.5 font-mono"
          >
            <span>Scan Results</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/25 rounded-lg px-3 py-1.5 text-cyan-300">
          <Info size={13} className="text-cyan-400 shrink-0" />
          <span><strong>Satellite:</strong> {sourceImage.filename.includes("Landsat") ? "Landsat-9 OLI-2 (30m)" : "Copernicus Sentinel-2 (10m)"}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-300">
          <span><strong>CRS:</strong> {investigation?.response?.spatial_summary?.crs || "EPSG:32644 (UTM)"}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-300">
          <span><strong>Targets:</strong> {targetsCount} Neural Localizations</span>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------
// Image viewer with interactive target focus & zoom
// ---------------------------------------------
function EvidenceImage({
  investigation,
  sourceImage,
  normalizedDetections,
  selectedTargetId,
  onSelectTarget,
  isFocused,
  onToggleFocus,
}: {
  investigation: CanonicalInvestigationState | null;
  sourceImage: CanonicalSourceImage;
  normalizedDetections: Array<{ id: string; evidenceId: string; label: string; score: number | null; box: [number, number, number, number] }>;
  selectedTargetId: string | null;
  onSelectTarget: (id: string | null) => void;
  isFocused: boolean;
  onToggleFocus: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  const selectedTarget = useMemo(() => {
    return normalizedDetections.find((d) => d.id === selectedTargetId) || null;
  }, [normalizedDetections, selectedTargetId]);

  const transformOrigin = useMemo(() => {
    if (!selectedTarget || !isFocused) return "center center";
    const [xmin, ymin, xmax, ymax] = selectedTarget.box;
    const cx = ((xmin + xmax) / 2 / 10).toFixed(1);
    const cy = ((ymin + ymax) / 2 / 10).toFixed(1);
    return `${cx}% ${cy}%`;
  }, [selectedTarget, isFocused]);

  const effectiveZoom = isFocused ? Math.max(zoom, 2.0) : zoom;

  const geoMeta = investigation?.response?.geospatial_metadata;
  const coordString = geoMeta?.geospatial_available && geoMeta.crs
    ? `CRS: ${geoMeta.crs} · RESOLUTION: ${geoMeta.resolution?.x || 10}m/px`
    : `SOURCE: ${sourceImage.filename} · SPATIAL FRAME: 512x512 PIXEL COORDINATES`;

  return (
    <div className="w-full flex-1 flex flex-col bg-[#09121d] relative overflow-hidden rounded-xl border border-slate-800/90 min-h-[480px] shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      {/* HUD Header Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#09111c] border-b border-slate-800/80 text-[11px] font-mono text-slate-400 z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-200 font-semibold uppercase tracking-wider text-[10px]">
            ACTIVE SOURCE IMAGE &amp; SPATIAL TARGETS ({normalizedDetections.length})
          </span>
          {selectedTarget && (
            <span className="text-emerald-300 font-bold ml-2">
              [FOCUS: {selectedTarget.id} ({selectedTarget.evidenceId})]
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-slate-900/80 border border-slate-800 rounded-md px-2 py-1 text-[10px] text-cyan-300 font-mono flex items-center gap-1.5">
            <Layers size={11} />
            <span>{sourceImage.filename}</span>
          </span>
        </div>
      </div>

      {/* Main Satellite Viewport with Real User Image */}
      <div className="flex-1 relative bg-[#09121d] overflow-hidden p-4 flex flex-col justify-between">
        {/* Actual Investigation Source Image Container */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            className="relative w-full h-full max-w-full max-h-full flex items-center justify-center transition-all duration-300 ease-out"
            style={{
              transform: `scale(${effectiveZoom})`,
              transformOrigin: transformOrigin,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sourceImage.dataUrl}
              alt={sourceImage.filename}
              className="w-full h-full object-contain select-none pointer-events-none"
            />

            {/* Dynamic Grounding Overlays with Target Selection */}
            {normalizedDetections.map((d) => {
              const [xmin, ymin, xmax, ymax] = d.box;
              const top = (ymin / 1000) * 100;
              const left = (xmin / 1000) * 100;
              const width = Math.max(2, ((xmax - xmin) / 1000) * 100);
              const height = Math.max(2, ((ymax - ymin) / 1000) * 100);
              const isSelected = selectedTargetId === d.id;

              return (
                <div
                  key={d.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTarget(isSelected ? null : d.id);
                  }}
                  className={`absolute border-2 rounded flex flex-col justify-between p-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-cyan-300 ring-4 ring-cyan-500/50 bg-cyan-500/30 z-30 shadow-[0_0_24px_rgba(6,182,212,0.9)] scale-[1.03]"
                      : selectedTargetId
                      ? "border-cyan-500/40 bg-cyan-500/10 opacity-50 hover:opacity-100 hover:border-cyan-400 z-10"
                      : "border-cyan-400 bg-cyan-500/15 hover:border-cyan-300 hover:bg-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.5)] z-15"
                  }`}
                  style={{
                    top: `${top}%`,
                    left: `${left}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                  }}
                >
                  <div className="flex justify-between items-center gap-1">
                    <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded border truncate ${
                      isSelected
                        ? "bg-cyan-500 text-slate-950 border-cyan-300"
                        : "bg-slate-900/90 text-cyan-300 border-cyan-500/30"
                    }`}>
                      {d.id}: {d.label}
                    </span>
                    {d.score !== null && (
                      <span className="text-[8px] font-mono text-emerald-300 bg-emerald-500/20 px-1 py-0.5 rounded font-semibold whitespace-nowrap">
                        {Math.round(d.score * 100)}%
                      </span>
                    )}
                  </div>
                  <div className={`self-center ${isSelected ? "opacity-100 animate-pulse" : "opacity-50"}`}>
                    <Crosshair size={isSelected ? 18 : 14} className={isSelected ? "text-cyan-300" : "text-cyan-400"} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Empty state notice if zero detections */}
        {normalizedDetections.length === 0 && (
          <div className="relative z-20 self-center bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-400 font-mono">
            No localized spatial targets for current query
          </div>
        )}

        {/* Interactive Zoom Controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 z-20 font-mono text-[10px]">
          {selectedTarget && (
            <button
              onClick={onToggleFocus}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer font-bold ${
                isFocused
                  ? "bg-cyan-500 text-[#091522]"
                  : "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
              }`}
              title="Focus Target"
            >
              <Focus size={12} />
              <span>{isFocused ? "Unfocus" : "Focus"}</span>
            </button>
          )}

          <button
            onClick={() => setZoom((z) => Math.min(Number((z + 0.25).toFixed(2)), 3.0))}
            className="p-1.5 rounded hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <span className="text-cyan-400 font-semibold px-1">{effectiveZoom.toFixed(2)}×</span>
          <button
            onClick={() => setZoom((z) => Math.max(Number((z - 0.25).toFixed(2)), 0.8))}
            className="p-1.5 rounded hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              if (isFocused) onToggleFocus();
              onSelectTarget(null);
            }}
            className="p-1.5 rounded hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        {/* Coordinates Banner */}
        <div className="relative z-20 text-[10px] font-mono text-slate-300 bg-slate-900/90 px-3 py-1 rounded-md border border-slate-800 self-start shadow">
          {coordString}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------
// Right panel: Findings & Target Evidence Verification
// ---------------------------------------------
function EvidencePanel({
  investigation,
  sourceImage,
  normalizedDetections,
  selectedTargetId,
  onSelectTarget,
  isFocused,
  onToggleFocus,
}: {
  investigation: CanonicalInvestigationState | null;
  sourceImage: CanonicalSourceImage;
  normalizedDetections: Array<{ id: string; evidenceId: string; label: string; score: number | null; box: [number, number, number, number] }>;
  selectedTargetId: string | null;
  onSelectTarget: (id: string | null) => void;
  isFocused: boolean;
  onToggleFocus: () => void;
}) {
  const [status, setStatus] = useState<string>("CONFIRMED");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedTarget = useMemo(() => {
    return normalizedDetections.find((d) => d.id === selectedTargetId) || null;
  }, [normalizedDetections, selectedTargetId]);

  const caption = typeof investigation?.response?.optical_caption === "string"
    ? investigation.response.optical_caption
    : (investigation?.response?.optical_caption as unknown as { caption?: string })?.caption || null;
  const vqa = investigation?.response?.vqa_results || [];
  const primaryAnswer = investigation?.response?.response_text ||
    (investigation?.response?.investigation_report?.observations && investigation.response.investigation_report.observations[0]) ||
    null;

  return (
    <div className="w-full border border-slate-800/90 bg-[#0c1624]/60 backdrop-blur-md rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.3)] min-h-[480px] space-y-4">
      <div className="space-y-4">
        {/* Investigation Query Banner */}
        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
              <Search size={12} />
              <span>Target User Query</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              {status}
            </span>
          </div>
          <p className="text-xs font-semibold text-white italic">
            &ldquo;{investigation?.query || "No query recorded"}&rdquo;
          </p>
          {primaryAnswer && (
            <div className="text-xs text-slate-200 pt-1.5 border-t border-slate-800/80 leading-relaxed font-sans">
              <strong className="text-cyan-300">Answer:</strong> {primaryAnswer}
            </div>
          )}
        </div>

        {/* Selected Target Inspector */}
        {selectedTarget ? (
          <div className="bg-cyan-950/30 border border-cyan-500/40 rounded-xl p-4 space-y-3 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Crosshair size={14} className="text-cyan-400 animate-pulse" />
                <span>Target: {selectedTarget.id}</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                {selectedTarget.score !== null ? `${Math.round(selectedTarget.score * 100)}% Confidence` : "Candidate"}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="text-slate-300">
                <strong className="text-white">Classification:</strong> <span className="capitalize">{selectedTarget.label}</span>
              </div>
              <div className="text-slate-300">
                <strong className="text-white">Model:</strong> Grounding DINO (Swin-T Open-Vocabulary)
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
              <div>Box [xmin, ymin, xmax, ymax]: [{selectedTarget.box.join(", ")}]</div>
              <div>Source Ingestion: {sourceImage.filename} ({sourceImage.source === "upload" ? "Uploaded by user" : "Demo raster"})</div>
              <div>Linked Evidence Node: <strong className="text-cyan-300">{selectedTarget.evidenceId}</strong></div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onToggleFocus}
                className={`flex-1 flex items-center justify-center gap-1 text-xs font-mono py-1.5 rounded transition-all cursor-pointer ${
                  isFocused
                    ? "bg-cyan-500 text-slate-950 font-bold"
                    : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300"
                }`}
              >
                <Focus size={12} />
                <span>{isFocused ? "Reset Zoom" : "Focus on Viewport"}</span>
              </button>
              <button
                onClick={() => onSelectTarget(null)}
                className="px-2.5 py-1.5 rounded text-xs font-mono bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Deselect
              </button>
            </div>
          </div>
        ) : null}

        {/* Evidence Findings & Entity Catalog */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-cyan-400" />
              <span>Evidence Nodes ({normalizedDetections.length})</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
              Provenance Synced
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {normalizedDetections.map((d) => {
              const isSelected = selectedTargetId === d.id;
              const [xmin, ymin, xmax, ymax] = d.box;
              return (
                <div
                  key={d.id}
                  onClick={() => onSelectTarget(isSelected ? null : d.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-xs font-mono ${
                    isSelected
                      ? "bg-cyan-500/20 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/50"
                      : "bg-slate-900/50 border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <Building2 size={13} className={isSelected ? "text-cyan-300" : "text-cyan-400"} />
                      <span>{d.id}: {d.label}</span>
                    </span>
                    {d.score !== null && (
                      <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                        {Math.round(d.score * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>[{xmin}, {ymin}, {xmax}, {ymax}]</span>
                    <span className="text-cyan-400 text-[10px]">Inspect →</span>
                  </div>
                </div>
              );
            })}

            {normalizedDetections.length === 0 && (
              <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/30 text-center text-xs text-slate-400 font-mono space-y-1">
                <p>No spatial bounding boxes recorded.</p>
                <p className="text-[10px] text-slate-500">Non-spatial queries provide multimodal reasoning.</p>
              </div>
            )}
          </div>
        </div>

        {/* Scene Context & VQA Insights */}
        {(caption || vqa.length > 0) && (
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Multimodal Context
            </span>
            {caption && (
              <p className="text-slate-300 leading-relaxed font-sans">
                <strong className="text-white">Scene:</strong> {caption}
              </p>
            )}
            {vqa.map((v, i) => (
              <div key={i} className="text-slate-300 font-mono text-[11px] pt-1 border-t border-slate-800/60">
                • {v.question} → <strong className="text-cyan-300">{v.answer}</strong>
              </div>
            ))}
          </div>
        )}

        {/* Verification Status Selector */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          <label className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
            Analyst Verification Flag
          </label>
          <div className="flex gap-2">
            {[
              { id: "CONFIRMED", label: "Confirmed", icon: CheckCircle2, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
              { id: "FLAGGED", label: "Flagged", icon: Flag, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
              { id: "DISMISSED", label: "Dismissed", icon: XCircle, color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
            ].map((btn) => {
              const active = status === btn.id;
              const Icon = btn.icon;
              return (
                <button
                  key={btn.id}
                  onClick={() => setStatus(btn.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    active ? `${btn.color} ring-1 ring-cyan-500/40 font-bold` : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon size={12} />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Provenance Toggle */}
        <div className="pt-1">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 font-mono py-1"
          >
            <span>Advanced Provenance Metadata</span>
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showAdvanced && (
            <div className="mt-2 p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 text-[10px] font-mono text-slate-400 space-y-1">
              <div>Investigation ID: {investigation?.investigation_id || "INV-STANDBY"}</div>
              <div>Grounding Specialist: IDEA-Research/grounding-dino-tiny</div>
              <div>Captioning Specialist: Salesforce/blip-image-captioning-base</div>
              <div>CRS / Projection: {investigation?.response?.geospatial_metadata?.crs || "Pixel frame reference"}</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
        <Link
          href="/reports"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-[#071320] text-xs font-bold rounded-lg py-2.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          <FileText size={13} />
          <span>Export Full Assessment Report</span>
        </Link>
        <Link
          href="/results"
          className="text-center py-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-[11px] font-mono text-slate-400 hover:text-white border border-slate-800/60 transition-all"
        >
          <span>← Back to Scan Results</span>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------
// Evidence Viewer Page Main Component
// ---------------------------------------------
export default function EvidenceViewerPage() {
  const [investigationState, setInvestigationState] = useState<CanonicalInvestigationState | null>(() => {
    return getCurrentInvestigation();
  });

  useEffect(() => {
    setInvestigationState(getCurrentInvestigation());

    const syncHandler = () => {
      setInvestigationState(getCurrentInvestigation());
    };

    window.addEventListener("nexspace-investigation-changed", syncHandler);
    window.addEventListener("nexspace-source-changed", syncHandler);
    window.addEventListener("storage", syncHandler);

    return () => {
      window.removeEventListener("nexspace-investigation-changed", syncHandler);
      window.removeEventListener("nexspace-source-changed", syncHandler);
      window.removeEventListener("storage", syncHandler);
    };
  }, []);

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(
    () => investigationState?.selectedTargetId || null
  );
  const [isFocused, setIsFocused] = useState(false);

  // Synchronized normalized detections extraction across all response channels
  const normalizedDetections = useMemo(() => {
    if (!investigationState?.response) return [];

    const list: Array<{ id: string; evidenceId: string; label: string; score: number | null; box: [number, number, number, number] }> = [];
    const seen = new Set<string>();

    // 1. Check grounding.detections
    const rawGrounding = investigationState.response.grounding?.detections || [];
    rawGrounding.forEach((det) => {
      const d = det as unknown as Record<string, unknown>;
      const nBox = normalizeBox(d);
      if (nBox) {
        const key = `${nBox.join(",")}-${d.label || ""}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: `TARGET-${String(list.length + 1).padStart(2, "0")}`,
            evidenceId: `EVD-${String(list.length + 1).padStart(3, "0")}`,
            label: (d.label as string) || `Target #${list.length + 1}`,
            score: typeof d.score === "number" ? d.score : null,
            box: nBox,
          });
        }
      }
    });

    // 2. Check evidence bounding boxes
    const rawEvidence = investigationState.response.evidence || [];
    rawEvidence.forEach((ev) => {
      const e = ev as unknown as Record<string, unknown>;
      const p = (e.payload as Record<string, unknown>) || e;
      if (e.type === "bounding_box" || p.box || p.box_2d || p.bbox_normalized || p.bbox_pixel) {
        const nBox = normalizeBox(p);
        if (nBox) {
          const key = `${nBox.join(",")}-${p.label || e.label || ""}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({
              id: `TARGET-${String(list.length + 1).padStart(2, "0")}`,
              evidenceId: `EVD-${String(list.length + 1).padStart(3, "0")}`,
              label: (p.label as string) || (e.label as string) || `Target #${list.length + 1}`,
              score: typeof p.score === "number" ? p.score : (typeof e.confidence === "number" ? e.confidence : null),
              box: nBox,
            });
          }
        }
      }
    });

    return list;
  }, [investigationState]);

  const handleSelectTarget = (id: string | null) => {
    setSelectedTargetId(id);
    if (!id) setIsFocused(false);
    updateSelectedTarget(id);
    const updated = getCurrentInvestigation();
    if (updated) setInvestigationState(updated);
  };

  const handleToggleFocus = () => {
    setIsFocused((f) => !f);
  };

  const sourceImage = useMemo<CanonicalSourceImage>(() => {
    if (investigationState?.source_image?.dataUrl) {
      return investigationState.source_image;
    }
    const active = getActiveSourceImage(false);
    if (active) return active;
    return DEFAULT_DEMO_SOURCE;
  }, [investigationState]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0a1420] text-white font-sans overflow-x-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          investigation={investigationState}
          sourceImage={sourceImage}
          targetsCount={normalizedDetections.length}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-5 items-start overflow-y-auto">
          <div className="lg:col-span-2">
            <EvidenceImage
              investigation={investigationState}
              sourceImage={sourceImage}
              normalizedDetections={normalizedDetections}
              selectedTargetId={selectedTargetId}
              onSelectTarget={handleSelectTarget}
              isFocused={isFocused}
              onToggleFocus={handleToggleFocus}
            />
          </div>
          <div className="lg:col-span-1">
            <EvidencePanel
              investigation={investigationState}
              sourceImage={sourceImage}
              normalizedDetections={normalizedDetections}
              selectedTargetId={selectedTargetId}
              onSelectTarget={handleSelectTarget}
              isFocused={isFocused}
              onToggleFocus={handleToggleFocus}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Minus,
  Maximize2,
  Send,
  Sparkles,
  RotateCcw,
  Layers,
  ArrowRight,
  UploadCloud,
  Search,
  GitCompare,
  Eye,
  Activity,
  FileText,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import NEXAIcon from "./NEXAIcon";
import { useNEXA, MessageItem } from "./NEXAProvider";
import { NexaAction } from "@/lib/nexa/intents";

/**
 * Lightweight Markdown Formatter for NEXA Assistant Messages
 */
function FormattedMessageText({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 text-xs text-slate-200 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Bullet point
        if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 text-slate-300">
              <span className="text-cyan-400 text-[10px] mt-0.5 shrink-0">✦</span>
              <div>{renderFormattedSpans(content)}</div>
            </div>
          );
        }

        return <p key={idx}>{renderFormattedSpans(trimmed)}</p>;
      })}
    </div>
  );
}

function renderFormattedSpans(text: string) {
  // Regex splitting for **bold**, `code`, and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-cyan-300">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/80 font-mono text-[11px] text-sky-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic text-slate-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

/**
 * Action Button Component inside Chat
 */
function ActionButtonTrigger({
  action,
  onTrigger,
}: {
  action: NexaAction;
  onTrigger: (action: NexaAction) => void;
}) {
  const getIcon = () => {
    switch (action.type) {
      case "OPEN_UPLOAD":
        return <UploadCloud size={13} className="text-cyan-400" />;
      case "OPEN_QUERY":
      case "OPEN_GROUNDING":
      case "OPEN_VQA":
        return <Search size={13} className="text-cyan-400" />;
      case "OPEN_CHANGE_ANALYSIS":
        return <GitCompare size={13} className="text-cyan-400" />;
      case "OPEN_EVIDENCE_VIEWER":
      case "OPEN_RESULTS":
        return <Eye size={13} className="text-cyan-400" />;
      case "OPEN_EXECUTION_TRACE":
      case "OPEN_EXECUTION_LOG":
        return <Activity size={13} className="text-cyan-400" />;
      case "OPEN_REPORT":
        return <FileText size={13} className="text-cyan-400" />;
      default:
        return <ArrowRight size={13} className="text-cyan-400" />;
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onTrigger(action)}
      className="inline-flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 via-sky-500/25 to-blue-500/20 hover:from-cyan-500/30 hover:to-sky-500/35 border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all cursor-pointer group"
    >
      <div className="p-1 rounded bg-cyan-500/20 border border-cyan-500/30">
        {getIcon()}
      </div>
      <span>{action.label}</span>
      <ArrowRight size={12} className="text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
    </motion.button>
  );
}

export default function NEXAPanel() {
  const {
    isOpen,
    isMinimized,
    closeAssistant,
    toggleMinimize,
    messages,
    isLoading,
    sendMessage,
    executeAction,
    clearConversation,
    appContext,
  } = useNEXA();

  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isLoading) return;
    sendMessage(inputVal);
    setInputVal("");
  };

  const handleSuggestionClick = (sug: string) => {
    // Strip leading emoji if present for cleaner prompt
    const cleanPrompt = sug.replace(/^[\p{Emoji}\u200d]+\s*/u, "").trim();
    sendMessage(cleanPrompt || sug);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          height: isMinimized ? "auto" : "min(580px, 82vh)",
        }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-19 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[390px] rounded-2xl border border-cyan-500/35 bg-[#071322]/80 backdrop-blur-xl shadow-[0_12px_45px_rgba(0,0,0,0.55),0_0_30px_rgba(6,182,212,0.2)] flex flex-col overflow-hidden font-sans select-none origin-bottom-right"
      >
        {/* Panel Header */}
        <header className="px-3.5 py-2.5 bg-gradient-to-r from-[#09182b]/80 via-[#0d213a]/80 to-[#09182b]/80 backdrop-blur-md border-b border-cyan-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center overflow-hidden">
              <NEXAIcon size={22} glow={false} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1">
                  <span className="text-cyan-400">✦</span> NEXA
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  AI GUIDE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">NexSpace AI Navigator</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={clearConversation}
              title="Reset conversation"
              aria-label="Reset conversation"
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={toggleMinimize}
              title={isMinimized ? "Expand" : "Minimize"}
              aria-label={isMinimized ? "Expand" : "Minimize"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              {isMinimized ? <Maximize2 size={13} /> : <Minus size={13} />}
            </button>
            <button
              onClick={closeAssistant}
              title="Close NEXA"
              aria-label="Close NEXA"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </header>

        {/* Minimized Placeholder View */}
        {isMinimized ? (
          <div
            onClick={toggleMinimize}
            className="p-3 bg-[#06101d] flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:bg-slate-900/60 transition-colors"
          >
            <span className="text-cyan-300 font-mono text-[11px] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              NEXA is minimized · Click to resume
            </span>
            <Maximize2 size={13} className="text-slate-400" />
          </div>
        ) : (
          <>
            {/* Real-time Application Context Bar */}
            <div className="px-3 py-1.5 bg-[#06101d]/60 backdrop-blur-sm border-b border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-slate-500">Route:</span>
                <span className="text-cyan-400 font-semibold truncate">
                  {appContext.currentPage || "/"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {appContext.hasSourceImage && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 truncate max-w-[130px]">
                    🖼️ {appContext.sourceImageFilename}
                  </span>
                )}
                {appContext.detectionsCount !== undefined && appContext.detectionsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    🎯 {appContext.detectionsCount} Targets
                  </span>
                )}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
              {messages.map((msg) => {
                const isUser = msg.sender === "user";

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`flex gap-2.5 max-w-[90%] ${
                        isUser ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {/* Avatar */}
                      {!isUser && (
                        <div className="w-6 h-6 rounded-full bg-[#0d213a]/90 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_8px_rgba(6,182,212,0.3)] overflow-hidden">
                          <NEXAIcon size={16} glow={false} />
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 shadow-md ${
                          isUser
                            ? "bg-gradient-to-r from-cyan-600/90 to-sky-600/90 backdrop-blur-sm text-white rounded-br-xs border border-cyan-400/40"
                            : "bg-[#09182b]/75 backdrop-blur-md text-slate-200 border border-slate-800/80 rounded-bl-xs"
                        }`}
                      >
                        {isUser ? (
                          <p className="text-xs font-sans whitespace-pre-wrap">{msg.text}</p>
                        ) : (
                          <FormattedMessageText text={msg.text} />
                        )}

                        {/* Embedded Action Button */}
                        {!isUser && msg.action && (
                          <ActionButtonTrigger
                            action={msg.action}
                            onTrigger={executeAction}
                          />
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[9px] font-mono text-slate-500 mt-1 px-1">
                      {msg.timestamp}
                    </span>

                    {/* Contextual Suggestions Chips below last assistant message */}
                    {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pl-8">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSuggestionClick(sug)}
                            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900/70 hover:bg-cyan-500/20 backdrop-blur-sm border border-slate-800/80 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all font-sans cursor-pointer active:scale-95"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loading Typing Indicator */}
              {isLoading && (
                <div className="flex items-center gap-2.5 pl-1">
                  <div className="w-6 h-6 rounded-full bg-[#0d213a]/90 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.3)] overflow-hidden">
                    <NEXAIcon size={16} glow={true} />
                  </div>
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-xs bg-[#09182b]/80 backdrop-blur-md border border-slate-800/90 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-200" />
                    <span className="text-[11px] font-mono text-cyan-400 ml-1">
                      NEXA is analyzing...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSubmit}
              className="p-3 bg-[#06101d]/75 backdrop-blur-md border-t border-cyan-500/20 shrink-0"
            >
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Ask NEXA anything (e.g. 'Find buildings', 'Compare images')..."
                  disabled={isLoading}
                  className="w-full bg-[#0c1a2d]/80 backdrop-blur-sm border border-slate-800/90 hover:border-slate-700 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 rounded-xl pl-3.5 pr-11 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isLoading}
                  aria-label="Send message"
                  className="absolute right-1.5 p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 hover:from-cyan-400 hover:to-sky-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.4)] active:scale-95"
                >
                  <Send size={13} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-2 px-1 text-[9px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={10} className="text-cyan-400" />
                  Verified NexSpace Intelligence
                </span>
                <span>Powered by Gemini</span>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

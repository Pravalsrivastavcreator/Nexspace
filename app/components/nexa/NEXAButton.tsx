"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import NEXAIcon from "./NEXAIcon";
import { useNEXA } from "./NEXAProvider";

export default function NEXAButton() {
  const { isOpen, toggleAssistant, unreadCount } = useNEXA();

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      {/* Tooltip on hover when closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="hidden md:flex items-center gap-2 absolute right-15 bottom-1.5 bg-[#091524]/95 border border-cyan-500/30 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-[0_0_16px_rgba(6,182,212,0.25)] pointer-events-none whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-semibold text-cyan-300 font-sans tracking-wide">
              ✦ NEXA
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              AI Guide
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Circular Assistant Button in Bottom-Right Corner */}
      <motion.button
        onClick={toggleAssistant}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        aria-label="Open NEXA AI Guide"
        className={`group relative flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-300 shadow-2xl cursor-pointer ${
          isOpen
            ? "bg-gradient-to-tr from-cyan-600 to-sky-500 border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.6)]"
            : "bg-[#06111f]/95 border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] backdrop-blur-md"
        }`}
      >
        {/* Animated Radial Pulse Aura */}
        <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500/25 via-sky-400/30 to-indigo-500/25 blur-sm group-hover:opacity-100 opacity-70 transition-opacity duration-300 animate-pulse" />

        {/* Content Icon */}
        <div className="relative z-10 flex items-center justify-center">
          {isOpen ? (
            <X size={20} className="text-slate-950 transition-transform duration-200" />
          ) : (
            <NEXAIcon size={34} glow={true} />
          )}
        </div>

        {/* Unread Message Badge Indicator */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-4 px-1 text-[9px] font-bold text-slate-950 bg-cyan-400 border border-cyan-200 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-bounce">
            {unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}

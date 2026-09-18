"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getCurrentInvestigation,
  getActiveSourceImage,
} from "@/app/utils/investigationStorage";
import type {
  CanonicalSourceImage,
  CanonicalInvestigationState,
} from "@/app/types/nexspace";
import { NexaAction } from "@/lib/nexa/intents";
import { NexaAppContext, NexaChatMessage } from "@/lib/nexa/gemini";

export interface MessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  action?: NexaAction | null;
  suggestions?: string[];
  provider?: "gemini" | "local_knowledge_engine";
}

interface NEXAContextType {
  isOpen: boolean;
  isMinimized: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  toggleMinimize: () => void;
  messages: MessageItem[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  executeAction: (action: NexaAction) => void;
  clearConversation: () => void;
  appContext: NexaAppContext;
  unreadCount: number;
}

const NEXAContext = createContext<NEXAContextType | null>(null);

const INITIAL_GREETING: MessageItem = {
  id: "greeting-0",
  sender: "assistant",
  text: "Hi! I'm **NEXA**, your official NexSpace AI Guide 👋\n\nI can help you navigate satellite imagery workflows, run **Grounding DINO** object detection, ask visual questions (**PaliGemma VQA**), compare **bi-temporal scenes**, and inspect verifiable **evidence** dossiers.\n\nWhat would you like to investigate?",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  suggestions: [
    "📤 Upload satellite imagery",
    "🔍 Locate buildings in my image",
    "🔄 Compare two satellite images",
    "🛰️ What is NexSpace?",
    "❓ What can I do here?",
  ],
};

export function NEXAProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([INITIAL_GREETING]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const pathname = usePathname();
  const router = useRouter();

  // Application context state
  const [appContext, setAppContext] = useState<NexaAppContext>({
    currentPage: pathname,
  });

  // Synchronize with NexSpace investigationStorage & pathname
  const refreshAppContext = useCallback(() => {
    try {
      const activeSrc = getActiveSourceImage(false);
      const curInv = getCurrentInvestigation();

      const detectionsCount =
        curInv?.response?.grounding?.detections?.length ||
        (curInv?.response?.evidence?.filter((e) => e.type === "object_detection").length ?? 0);

      const hasChange = Boolean(curInv?.response?.change_analysis);
      const anomaliesCount = curInv?.response?.change_analysis?.anomalies?.length || 0;
      const changedFraction = curInv?.response?.change_analysis?.changed_fraction || 0;

      setAppContext({
        currentPage: pathname,
        hasSourceImage: Boolean(activeSrc?.dataUrl),
        sourceImageFilename: activeSrc?.filename,
        sourceImageSource: activeSrc?.source,
        hasInvestigation: Boolean(curInv?.investigation_id || curInv?.response),
        investigationId: curInv?.investigation_id,
        lastQuery: curInv?.query,
        detectionsCount,
        hasChangeAnalysis: hasChange,
        anomaliesCount,
        changedFraction,
      });
    } catch (err) {
      console.warn("[NEXAProvider] Error reading app state:", err);
    }
  }, [pathname]);

  useEffect(() => {
    refreshAppContext();

    const handleSync = () => refreshAppContext();
    window.addEventListener("nexspace-investigation-changed", handleSync);
    window.addEventListener("nexspace-source-changed", handleSync);
    window.addEventListener("nexspace-investigation-cleared", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener("nexspace-investigation-changed", handleSync);
      window.removeEventListener("nexspace-source-changed", handleSync);
      window.removeEventListener("nexspace-investigation-cleared", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [refreshAppContext]);

  const openAssistant = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const toggleAssistant = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        setIsMinimized(false);
        setUnreadCount(0);
        return true;
      }
      return false;
    });
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([INITIAL_GREETING]);
  }, []);

  const executeAction = useCallback(
    (action: NexaAction) => {
      if (!action || !action.route) return;

      if (action.prefillQuery) {
        // Pass prefill query via search params or URL
        const url = new URL(action.route, window.location.origin);
        url.searchParams.set("q", action.prefillQuery);
        router.push(url.pathname + url.search);
      } else {
        router.push(action.route);
      }
    },
    [router]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const cleanText = text.trim();
      if (!cleanText || isLoading) return;

      const userMsg: MessageItem = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: cleanText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const conversationHistory: NexaChatMessage[] = messages.slice(-10).map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }));

        const res = await fetch("/api/nexa/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: cleanText,
            conversation: conversationHistory,
            context: appContext,
          }),
        });

        const data = await res.json();

        const assistantMsg: MessageItem = {
          id: `asst-${Date.now()}`,
          sender: "assistant",
          text: data.message || "I am NEXA, your NexSpace assistant.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          action: data.action || null,
          suggestions: data.suggestions || [],
          provider: data.provider,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (!isOpen) {
          setUnreadCount((c) => c + 1);
        }
      } catch (err) {
        console.error("[NEXAProvider] Error sending message:", err);
        const errMsg: MessageItem = {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: "I'm having trouble connecting right now. Please check your network or try asking again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, appContext, isOpen]
  );

  return (
    <NEXAContext.Provider
      value={{
        isOpen,
        isMinimized,
        openAssistant,
        closeAssistant,
        toggleAssistant,
        toggleMinimize,
        messages,
        isLoading,
        sendMessage,
        executeAction,
        clearConversation,
        appContext,
        unreadCount,
      }}
    >
      {children}
    </NEXAContext.Provider>
  );
}

export function useNEXA() {
  const ctx = useContext(NEXAContext);
  if (!ctx) {
    throw new Error("useNEXA must be used within a NEXAProvider");
  }
  return ctx;
}

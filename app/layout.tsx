import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OrbitalEnergyBackground from "./components/OrbitalEnergyBackground";
import { NEXAProvider } from "./components/nexa/NEXAProvider";
import NEXAAssistant from "./components/nexa/NEXAAssistant";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexSpace — Orbital Geospatial Intelligence Platform",
  description: "Next-generation AI-powered natural language satellite imagery intelligence and automated anomaly detection.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#06111d] text-white selection:bg-cyan-500/20 selection:text-cyan-300"
      >
        <OrbitalEnergyBackground />
        <NEXAProvider>
          {children}
          <NEXAAssistant />
        </NEXAProvider>
      </body>
    </html>
  );
}


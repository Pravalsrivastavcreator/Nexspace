"use client";

import React, { useState } from "react";

interface NEXAIconProps {
  size?: number;
  className?: string;
  glow?: boolean;
  imageSrc?: string;
}

export default function NEXAIcon({
  size = 28,
  className = "",
  glow = true,
  imageSrc = "/nexa-icon.png",
}: NEXAIconProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Subtle Orbital Cyan Glow Background */}
      {glow && (
        <span
          className="absolute inset-0 rounded-full bg-cyan-400/30 blur-[4px] animate-pulse pointer-events-none"
          style={{ transform: "scale(1.2)" }}
        />
      )}

      {/* Provided Cosmic Star AI Icon */}
      {!imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt="NEXA AI Guide"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover scale-150 relative z-10 transition-transform duration-300 group-hover:scale-165 brightness-125 contrast-125"
        />
      ) : (
        /* Dynamic SVG Vector Fallback */
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          <ellipse
            cx="24"
            cy="24"
            rx="18"
            ry="8"
            transform="rotate(-30 24 24)"
            stroke="#22d3ee"
            strokeWidth="2"
          />
          <circle cx="24" cy="24" r="8" fill="#081528" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="24" cy="24" r="3" fill="#67e8f9" />
        </svg>
      )}
    </div>
  );
}

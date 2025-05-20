// src/components/CyberpunkTheme.js
import React from "react";

/**
 * Component that applies the cyberpunk theme styles
 * This component doesn't render anything, it just applies CSS variables to the DOM
 */
const CyberpunkTheme = ({ isActive }) => {
  // Apply CSS variables to document root when theme is active
  React.useEffect(() => {
    if (isActive) {
      // Cyberpunk theme colors
      document.documentElement.style.setProperty("--bg-primary", "#0a0e17");
      document.documentElement.style.setProperty("--bg-secondary", "#141b29");
      document.documentElement.style.setProperty("--bg-tertiary", "#1a2235");
      document.documentElement.style.setProperty("--text-primary", "#e2f3f5");
      document.documentElement.style.setProperty("--text-secondary", "#a2bedb");
      document.documentElement.style.setProperty("--accent-primary", "#06b6d4");
      document.documentElement.style.setProperty(
        "--accent-secondary",
        "#9333ea",
      );
      document.documentElement.style.setProperty(
        "--neon-glow",
        "0 0 10px rgba(6, 182, 212, 0.7)",
      );
      document.documentElement.style.setProperty(
        "--line-primary",
        "rgba(6, 182, 212, 0.7)",
      );
      document.documentElement.style.setProperty(
        "--line-secondary",
        "rgba(147, 51, 234, 0.7)",
      );

      // Update node colors for dark theme
      document.documentElement.style.setProperty("--node-pod", "#0ea5e9");
      document.documentElement.style.setProperty("--node-namespace", "#10b981");
      document.documentElement.style.setProperty("--node-ipblock", "#f59e0b");
      document.documentElement.style.setProperty("--node-combined", "#8b5cf6");
    } else {
      // Restore light theme (default) colors
      document.documentElement.style.setProperty("--bg-primary", "#f3f4f6");
      document.documentElement.style.setProperty("--bg-secondary", "#ffffff");
      document.documentElement.style.setProperty("--bg-tertiary", "#f9fafb");
      document.documentElement.style.setProperty("--text-primary", "#111827");
      document.documentElement.style.setProperty("--text-secondary", "#4b5563");
      document.documentElement.style.setProperty("--accent-primary", "#2563eb");
      document.documentElement.style.setProperty(
        "--accent-secondary",
        "#3b82f6",
      );
      document.documentElement.style.setProperty("--neon-glow", "none");
      document.documentElement.style.setProperty(
        "--line-primary",
        "rgba(37, 99, 235, 0.7)",
      );
      document.documentElement.style.setProperty(
        "--line-secondary",
        "rgba(59, 130, 246, 0.7)",
      );

      // Restore original node colors
      document.documentElement.style.setProperty("--node-pod", "#66aaff");
      document.documentElement.style.setProperty("--node-namespace", "#44cc44");
      document.documentElement.style.setProperty("--node-ipblock", "#ffaa44");
      document.documentElement.style.setProperty("--node-combined", "#9966cc");
    }
  }, [isActive]);

  // This component doesn't render anything
  return null;
};

export default CyberpunkTheme;

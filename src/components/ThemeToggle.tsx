"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

export function ThemeToggle() {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [large, setLarge] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setMode(root.getAttribute("data-theme") === "light" ? "light" : "dark");
    setLarge(root.getAttribute("data-text") === "large");
  }, []);

  function toggleMode() {
    const next = mode === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("edx-mode", next);
    } catch {}
    setMode(next);
  }

  function toggleText() {
    const next = !large;
    document.documentElement.setAttribute("data-text", next ? "large" : "normal");
    try {
      localStorage.setItem("edx-text", next ? "large" : "normal");
    } catch {}
    setLarge(next);
  }

  const nextLabel = mode === "dark" ? "Switch to light mode" : "Switch to night mode";
  return (
    <div className="cluster" style={{ gap: "var(--space-1)" }}>
      <button type="button" className="text-button" onClick={toggleText} aria-pressed={large} aria-label={large ? "Use normal text size" : "Use large text"} title={large ? "Use normal text size" : "Use large text"}>
        <Icon name="text-size" />
      </button>
      <button type="button" className="theme-toggle" onClick={toggleMode} aria-pressed={mode === "light"} aria-label={nextLabel} title={nextLabel}>
        <span className="theme-toggle-track" aria-hidden="true">
          <span className="theme-toggle-core" />
        </span>
      </button>
    </div>
  );
}

/**
 * Headless / automated / sandboxed browser detection.
 *
 * Collects a set of independent hints. No single hint is conclusive, so a
 * threshold is used to avoid punishing unusual-but-legitimate browsers.
 */

import { handleAnomaly } from "./signals";

function collectHints(): string[] {
  const hints: string[] = [];
  const nav = navigator as Navigator & {
    webdriver?: boolean;
    languages?: readonly string[];
  };

  if (nav.webdriver === true) hints.push("navigator.webdriver");

  if (Array.isArray(nav.languages) && nav.languages.length === 0) {
    hints.push("empty-languages");
  }

  const ua = navigator.userAgent.toLowerCase();
  if (
    ua.includes("headlesschrome") ||
    ua.includes("phantomjs") ||
    ua.includes("slimerjs")
  ) {
    hints.push("headless-ua");
  }

  // Chromium exposes window.chrome; a Chrome UA without it is a strong tell.
  if (ua.includes("chrome/") && !("chrome" in window)) {
    hints.push("missing-window.chrome");
  }

  // Common automation globals injected by drivers.
  for (const marker of [
    "__nightmare",
    "_phantom",
    "callPhantom",
    "__selenium_unwrapped",
    "__webdriver_evaluate",
    "__driver_evaluate",
    "domAutomation",
    "domAutomationController",
  ]) {
    if (marker in window) hints.push(`global:${marker}`);
  }

  // A real device reports at least one plugin or a non-zero hardware profile.
  if (
    navigator.plugins.length === 0 &&
    (navigator.hardwareConcurrency ?? 0) === 0
  ) {
    hints.push("no-plugins-no-cores");
  }

  return hints;
}

export function runSandboxCheck(): void {
  try {
    const hints = collectHints();
    if (hints.length >= 2) {
      handleAnomaly("sandbox", hints.join(","));
    }
  } catch {
    /* detection must never break the app */
  }
}

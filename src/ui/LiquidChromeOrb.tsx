"use client";

import styles from "./LiquidChromeOrb.module.css";
import { renderAtomSvg } from "./atomArtwork";

export type LiquidChromeOrbProps = {
  /** Pixel size of the sphere (default 18 — fits dense chrome). */
  size?: number;
  title?: string;
  className?: string;
};

/**
 * Sole brand icon: liquid-chrome sphere with overlapping atom orbits.
 * Keep this as the only decorative mark in the product chrome.
 */
export function LiquidChromeOrb({
  size = 18,
  title = "Work Sync",
  className,
}: LiquidChromeOrbProps) {
  return (
    <span
      className={[styles.orb, className].filter(Boolean).join(" ")}
      style={{ ["--orb-size" as string]: `${size}px` }}
      role="img"
      aria-label={title}
      title={title}
    >
      <span className={styles.artwork} dangerouslySetInnerHTML={{ __html: renderAtomSvg(undefined, true) }} />
    </span>
  );
}

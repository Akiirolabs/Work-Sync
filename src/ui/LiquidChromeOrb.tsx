"use client";

import styles from "./LiquidChromeOrb.module.css";

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
      <span className={styles.core}>
        <svg className={styles.svg} viewBox="0 0 24 24" aria-hidden>
          <circle className={styles.nucleus} cx="12" cy="12" r="1.35" />
          <g className={styles.orbitA}>
            <ellipse className={styles.orbit} cx="12" cy="12" rx="8.2" ry="3.2" />
            <circle className={styles.electron} cx="20.2" cy="12" r="0.85" />
          </g>
          <g className={styles.orbitB}>
            <ellipse
              className={styles.orbit}
              cx="12"
              cy="12"
              rx="8.2"
              ry="3.2"
              transform="rotate(60 12 12)"
            />
            <circle className={styles.electron} cx="8" cy="5.2" r="0.75" />
          </g>
          <g className={styles.orbitC}>
            <ellipse
              className={styles.orbit}
              cx="12"
              cy="12"
              rx="8.2"
              ry="3.2"
              transform="rotate(-60 12 12)"
            />
            <circle className={styles.electron} cx="7.5" cy="18" r="0.7" />
          </g>
        </svg>
      </span>
    </span>
  );
}

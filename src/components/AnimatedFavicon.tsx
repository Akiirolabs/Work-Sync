"use client";

import { useEffect } from "react";
import { atomFrameAt, renderAtomSvg } from "@/ui/atomArtwork";

const FRAME_INTERVAL = 40;

export function AnimatedFavicon() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    let created = false;
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
      created = true;
    }

    const originalHref = icon.href;
    const originalType = icon.type;
    icon.type = "image/svg+xml";
    let request = 0;
    let previous = 0;

    function draw(time: number) {
      if (!motion.matches && document.visibilityState === "visible" && time - previous >= FRAME_INTERVAL) {
        previous = time;
        const frame = `data:image/svg+xml,${encodeURIComponent(renderAtomSvg(atomFrameAt(time)))}`;
        document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach((candidate) => {
          candidate.type = "image/svg+xml";
          candidate.href = frame;
        });
      }
      request = window.requestAnimationFrame(draw);
    }

    function restoreStaticIcon() {
      if (motion.matches) document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach((candidate) => { candidate.href = originalHref || "/icon.svg"; });
    }

    motion.addEventListener("change", restoreStaticIcon);
    request = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(request);
      motion.removeEventListener("change", restoreStaticIcon);
      if (created) icon?.remove();
      document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach((candidate) => { candidate.href = originalHref; candidate.type = originalType; });
    };
  }, []);

  return null;
}

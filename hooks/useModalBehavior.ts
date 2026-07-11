"use client";

import { useEffect, useRef } from "react";

// Lightweight dialog behavior: focus the first interactive element on open,
// close on Escape, restore focus to the opener on close.
// (Deliberately not a full focus trap — see plan; keeps modals simple.)
export function useModalBehavior(onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const first = containerRef.current?.querySelector<HTMLElement>(
      "button, input, [tabindex]"
    );
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  return containerRef;
}

"use client";

import { useCallback, useRef, useState } from "react";
import type { ToastMessage } from "@/components/Toast";

// Single-slot toast with optional auto-hide.
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (type: ToastMessage["type"], text: string, autoHideMs?: number) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ type, text });
      if (autoHideMs) {
        hideTimer.current = setTimeout(() => setToast(null), autoHideMs);
      }
    },
    []
  );

  return { toast, showToast };
}

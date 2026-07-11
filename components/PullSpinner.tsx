"use client";

// Pull-to-refresh spinner (circular arrow).
// iOS Safari: this element must stay permanently in the DOM with only
// opacity animated (single element + will-change) to avoid flicker.
export function PullSpinner({
  pullDistance,
  isRefreshing,
  threshold,
}: {
  pullDistance: number;
  isRefreshing: boolean;
  threshold: number;
}) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none"
      style={{
        top: isRefreshing ? 36 : Math.max(-50, pullDistance - 50),
        opacity: isRefreshing ? 1 : Math.min(pullDistance / threshold, 1),
        willChange: "opacity",
      }}
    >
      <div className={isRefreshing ? "animate-[spin_1s_linear_infinite]" : ""}>
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-200"
        >
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </div>
    </div>
  );
}

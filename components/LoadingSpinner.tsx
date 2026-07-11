"use client";

// Centered loading spinner shown until the first Firestore snapshot arrives.
export function LoadingSpinner() {
  return (
    <div className="flex justify-center mt-20" role="status" aria-label="載入中">
      <div className="animate-[spin_1s_linear_infinite]">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-500"
        >
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </div>
    </div>
  );
}

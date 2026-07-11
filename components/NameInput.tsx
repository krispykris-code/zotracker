"use client";

import { useState } from "react";

// Nickname prompt shown once per device (before any records can be added).
export function NameInput({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState("");

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 gap-8">
      <div className="text-center">
        <div className="text-5xl mb-4">😴</div>
        <h1 className="text-2xl font-bold mb-2">你的名字是？</h1>
        <p className="text-slate-400 text-sm">用來標記誰的睡眠紀錄</p>
      </div>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="輸入暱稱"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={handleSave}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
        >
          開始記錄
        </button>
      </div>
    </div>
  );
}

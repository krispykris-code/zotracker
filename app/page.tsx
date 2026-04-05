"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SleepRecord } from "@/lib/types";
import {
  calcDuration,
  durationColor,
  formatShortDate,
  formatWeekday,
  smartDefaults,
} from "@/lib/sleep";
import {
  registerSW,
  requestNotificationPermission,
  getYesterdaySleep,
  scheduleReminder,
} from "@/lib/notifications";
import { APP_VERSION, APP_LAST_UPDATED } from "@/lib/version";

// ─── Room ID from URL ────────────────────────────────
function getRoomId(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("room");
}

// ═════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════
export default function Home() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SleepRecord | null>(null);

  // Form states
  const [formDate, setFormDate] = useState("");
  const [formBedtime, setFormBedtime] = useState("");
  const [formWakeTime, setFormWakeTime] = useState("");
  const [formIsMc, setFormIsMc] = useState(false);

  // Notification states
  const [showBanner, setShowBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [notifDismissed, setNotifDismissed] = useState(false);

  // Update banner & toast
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "updating" | "complete";
    text: string;
  } | null>(null);
  const [showLatestMessage, setShowLatestMessage] = useState(false);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const PULL_THRESHOLD = 60;
  const MAX_PULL = 100;

  // ─── Init: load room & name ──────────────────────
  useEffect(() => {
    let rid = getRoomId();
    // If no room in URL, check localStorage for saved room
    if (!rid) {
      const savedRoom = localStorage.getItem("zotracker-room");
      if (savedRoom) {
        // Redirect to saved room
        window.location.search = `?room=${savedRoom}`;
        return;
      }
    } else {
      // Save room ID to localStorage
      localStorage.setItem("zotracker-room", rid);
    }
    setRoomId(rid);
    const stored = localStorage.getItem("zotracker-name");
    if (stored) {
      setUserName(stored);
      setSavedName(stored);
    }
    // Register service worker
    registerSW();
    // Check if notification prompt was already dismissed
    if (localStorage.getItem("zotracker-notif-dismissed")) {
      setNotifDismissed(true);
    }
    // Version check: show update banner if existing user has older version
    const storedVersion = localStorage.getItem("zotracker-version");
    const hasUserData =
      localStorage.getItem("zotracker-name") ||
      localStorage.getItem("zotracker-room");
    if (storedVersion === null) {
      // First time or existing user without version stored
      if (hasUserData) {
        // Existing user → show update banner
        setShowUpdateBanner(true);
      } else {
        // Brand new user → save current version silently
        localStorage.setItem("zotracker-version", APP_VERSION);
      }
    } else if (storedVersion !== APP_VERSION) {
      // Outdated → show update banner AND auto-update after delay
      setShowUpdateBanner(true);
      const autoUpdateTimer = setTimeout(() => {
        setToastMessage({ type: "updating", text: "🔄 更新中..." });
        setShowUpdateBanner(false);
        localStorage.setItem("zotracker-version", APP_VERSION);
        sessionStorage.setItem("zotracker-update-complete", "1");
        setTimeout(() => window.location.reload(), 800);
      }, 4000);
      // Store timer globally so dismiss button can cancel it
      (window as unknown as { __autoUpdateTimer?: ReturnType<typeof setTimeout> }).__autoUpdateTimer = autoUpdateTimer;
    }
    // Check if we just finished an update (from previous reload)
    if (sessionStorage.getItem("zotracker-update-complete")) {
      sessionStorage.removeItem("zotracker-update-complete");
      setToastMessage({ type: "complete", text: "✓ 更新完成！" });
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, []);

  // ─── Update app (reload) ──────────────────────────
  const handleUpdateApp = useCallback(() => {
    // Clear auto-update timer if running
    const timer = (window as unknown as { __autoUpdateTimer?: ReturnType<typeof setTimeout> }).__autoUpdateTimer;
    if (timer) clearTimeout(timer);
    setToastMessage({ type: "updating", text: "🔄 更新中..." });
    setShowUpdateBanner(false);
    localStorage.setItem("zotracker-version", APP_VERSION);
    sessionStorage.setItem("zotracker-update-complete", "1");
    setTimeout(() => window.location.reload(), 800);
  }, []);

  // ─── Pull-to-refresh handlers ─────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (mainScrollRef.current && mainScrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null || isRefreshing) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && mainScrollRef.current?.scrollTop === 0) {
      // Resistance: diminishing return as user pulls further
      const resisted = Math.min(delta * 0.5, MAX_PULL);
      setPullDistance(resisted);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartY.current === null) return;
    touchStartY.current = null;
    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance]);

  // ─── Check update (from settings) ─────────────────
  const handleCheckUpdate = useCallback(() => {
    const storedVersion = localStorage.getItem("zotracker-version");
    if (storedVersion === APP_VERSION) {
      setShowLatestMessage(true);
      setTimeout(() => setShowLatestMessage(false), 3000);
    } else {
      setToastMessage({ type: "updating", text: "🔄 更新中..." });
      localStorage.setItem("zotracker-version", APP_VERSION);
      sessionStorage.setItem("zotracker-update-complete", "1");
      setTimeout(() => window.location.reload(), 800);
    }
  }, []);

  // ─── Check yesterday's sleep & schedule reminder ──
  useEffect(() => {
    if (!savedName || records.length === 0) return;
    const { sleptUnder7h } = getYesterdaySleep(records, savedName);
    if (sleptUnder7h) {
      setShowBanner(true);
      scheduleReminder(savedName);
    }
  }, [records, savedName]);

  // ─── Request notification permission ──────────────
  const handleEnableNotif = useCallback(async () => {
    await requestNotificationPermission();
    setNotifDismissed(true);
    localStorage.setItem("zotracker-notif-dismissed", "1");
  }, []);

  // ─── Firestore listener ──────────────────────────
  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(db, "rooms", roomId, "records"),
      orderBy("date", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data: SleepRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as SleepRecord[];
      setRecords(data);
    });
    return () => unsub();
  }, [roomId]);

  // ─── Save name ───────────────────────────────────
  const handleSaveName = useCallback(() => {
    const trimmed = userName.trim();
    if (!trimmed) return;
    localStorage.setItem("zotracker-name", trimmed);
    setSavedName(trimmed);
  }, [userName]);

  // ─── Room history helpers ─────────────────────────
  const getRoomHistory = useCallback((): string[] => {
    try {
      return JSON.parse(localStorage.getItem("zotracker-room-history") || "[]");
    } catch {
      return [];
    }
  }, []);

  const addToRoomHistory = useCallback(
    (id: string) => {
      const history = getRoomHistory().filter((h) => h !== id);
      history.unshift(id); // newest first
      localStorage.setItem(
        "zotracker-room-history",
        JSON.stringify(history.slice(0, 5))
      );
    },
    [getRoomHistory]
  );

  const removeFromRoomHistory = useCallback(
    (id: string) => {
      const history = getRoomHistory().filter((h) => h !== id);
      localStorage.setItem(
        "zotracker-room-history",
        JSON.stringify(history)
      );
    },
    [getRoomHistory]
  );

  // ─── Go to homepage ───────────────────────────────
  const handleGoHome = useCallback(() => {
    localStorage.removeItem("zotracker-room");
    window.location.href = window.location.origin;
  }, []);

  // ─── Create room ─────────────────────────────────
  const handleCreateRoom = useCallback(() => {
    const id = Math.random().toString(36).slice(2, 8);
    addToRoomHistory(id);
    localStorage.setItem("zotracker-room", id);
    window.location.search = `?room=${id}`;
  }, [addToRoomHistory]);

  // ─── Add / update record ──────────────────────────
  const handleAddRecord = useCallback(async () => {
    if (!roomId || !savedName) return;
    const newDocId = `${formDate}_${savedName}`;

    // If editing and date changed, delete old record first
    if (editingRecord && editingRecord.id !== newDocId) {
      await deleteDoc(doc(db, "rooms", roomId, "records", editingRecord.id));
    }

    await setDoc(doc(db, "rooms", roomId, "records", newDocId), {
      date: formDate,
      bedtime: formBedtime,
      wakeTime: formWakeTime,
      person: savedName,
      createdAt: editingRecord?.createdAt ?? Date.now(),
      isMc: formIsMc,
    });
    setShowForm(false);
    setEditingRecord(null);
  }, [roomId, savedName, formDate, formBedtime, formWakeTime, formIsMc, editingRecord]);

  // ─── Edit record (fill in wake time) ─────────────
  const handleEdit = useCallback((r: SleepRecord) => {
    setEditingRecord(r);
    setFormDate(r.date);
    setFormBedtime(r.bedtime);
    setFormWakeTime(r.wakeTime);
    setFormIsMc(r.isMc ?? false);
    setShowForm(true);
  }, []);

  // ─── Delete record ───────────────────────────────
  const handleDelete = useCallback(
    async (id: string) => {
      if (!roomId) return;
      if (!confirm("確定要刪除這筆紀錄嗎？")) return;
      await deleteDoc(doc(db, "rooms", roomId, "records", id));
    },
    [roomId]
  );

  // ─── Share link ──────────────────────────────────
  const shareLink = roomId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}?room=${roomId}`
    : "";

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({
        title: "ZoTracker",
        text: "一起來記錄睡眠吧！",
        url: shareLink,
      });
    } else {
      await navigator.clipboard.writeText(shareLink);
      alert("已複製連結！傳給朋友就能一起記錄 ✌️");
    }
  }, [shareLink]);

  // Room settings states
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ─── Delete entire room ──────────────────────────
  const handleDeleteRoom = useCallback(async () => {
    if (!roomId) return;
    const snap = await getDocs(collection(db, "rooms", roomId, "records"));
    const deletes = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletes);
    removeFromRoomHistory(roomId);
    localStorage.removeItem("zotracker-room");
    setShowDeleteConfirm(false);
    setShowSettings(false);
    window.location.href = window.location.origin;
  }, [roomId, removeFromRoomHistory]);

  // ─── Join room ────────────────────────────────────
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [historyVersion, setHistoryVersion] = useState(0);

  const handleJoinRoom = useCallback(
    (idOverride?: string) => {
      const input = idOverride || joinInput.trim();
      if (!input) return;
      const match = input.match(/[?&]room=([^&]+)/);
      const id = match ? match[1] : input;
      addToRoomHistory(id);
      localStorage.setItem("zotracker-room", id);
      window.location.search = `?room=${id}`;
    },
    [joinInput, addToRoomHistory]
  );

  const handleJoinRoomClick = useCallback(() => {
    handleJoinRoom();
  }, [handleJoinRoom]);

  // ═══════════════════════════════════════════════════
  // RENDER: No room yet → Landing
  // ═══════════════════════════════════════════════════
  if (!roomId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 gap-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🌙</div>
          <h1 className="text-3xl font-bold mb-2">ZoTracker</h1>
          <p className="text-slate-400">和朋友一起記錄睡眠</p>
        </div>
        <div className="w-full max-w-xs flex flex-col gap-3">
          <button
            onClick={handleCreateRoom}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-6 rounded-2xl text-lg transition-colors active:scale-95"
          >
            建立房間
          </button>
          <button
            onClick={() => setShowJoinInput(true)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 px-6 rounded-2xl text-lg transition-colors active:scale-95"
          >
            加入房間
          </button>
        </div>

        {/* Join room input overlay */}
        {showJoinInput && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowJoinInput(false)}
            />
            <div className="relative w-full max-w-xs bg-slate-900 rounded-2xl px-5 py-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">加入房間</h3>
                <button
                  onClick={() => setShowJoinInput(false)}
                  className="text-slate-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                貼上朋友分享的連結或房間 ID
              </p>
              <input
                type="text"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                placeholder="連結或房間 ID"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-base placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-3"
              />
              <button
                onClick={handleJoinRoomClick}
                disabled={!joinInput.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
              >
                加入
              </button>

              {/* Room history */}
              {historyVersion >= 0 && getRoomHistory().length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2">最近加入的房間</p>
                  <div className="flex flex-col gap-1">
                    {getRoomHistory().map((rid) => (
                      <div
                        key={rid}
                        className="flex items-center bg-slate-800 rounded-lg"
                      >
                        <button
                          onClick={() => handleJoinRoom(rid)}
                          className="flex-1 text-left text-sm text-slate-300 px-3 py-2.5 hover:text-white transition-colors"
                        >
                          {rid}
                        </button>
                        <button
                          onClick={() => {
                            removeFromRoomHistory(rid);
                            setHistoryVersion((v) => v + 1);
                          }}
                          className="text-slate-600 hover:text-rose-400 px-3 py-2.5 text-sm transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-slate-500 text-sm text-center max-w-xs">
          建立房間後分享連結給朋友，
          <br />
          就能一起記錄和查看彼此的睡眠！
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // RENDER: Has room but no name → Name input
  // ═══════════════════════════════════════════════════
  if (!savedName) {
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
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            placeholder="輸入暱稱"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleSaveName}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
          >
            開始記錄
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // RENDER: Main tracker view
  // ═══════════════════════════════════════════════════
  return (
    <div className="flex flex-1 flex-col max-w-lg mx-auto w-full">
      {/* Update toast (centered) */}
      {toastMessage && (
        <div
          className={`fixed top-1/2 left-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 rounded-2xl px-6 py-4 text-base font-medium shadow-2xl animate-[fadeInScale_0.2s_ease-out] ${
            toastMessage.type === "updating"
              ? "bg-indigo-500/95 border border-indigo-400/60 text-white"
              : "bg-emerald-500/95 border border-emerald-400/60 text-white"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div>
          <button
            onClick={handleGoHome}
            className="text-xl font-bold flex items-center gap-2 hover:text-indigo-400 transition-colors"
          >
            🌙 ZoTracker
          </button>
          <p className="text-xs text-slate-500 mt-0.5">
            Room: {roomId} · {savedName}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Link
            href={`/calendar?room=${roomId}`}
            className="bg-slate-800 hover:bg-slate-700 text-base px-3 py-2 rounded-xl transition-colors active:scale-95"
          >
            📅
          </Link>
          <Link
            href={`/stats?room=${roomId}`}
            className="bg-slate-800 hover:bg-slate-700 text-base px-3 py-2 rounded-xl transition-colors active:scale-95"
          >
            📊
          </Link>
          <button
            onClick={handleShare}
            className="bg-slate-800 hover:bg-slate-700 text-base px-3 py-2 rounded-xl transition-colors active:scale-95"
          >
            🔗
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="bg-slate-800 hover:bg-slate-700 text-base px-3 py-2 rounded-xl transition-colors active:scale-95"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Update banner */}
      {showUpdateBanner && (
        <div className="mx-5 mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl shrink-0">🆕</span>
          <p className="text-emerald-300 text-sm flex-1">有新功能可用</p>
          <button
            onClick={handleUpdateApp}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 transition-colors active:scale-95"
          >
            立即更新
          </button>
          <button
            onClick={() => {
              const timer = (window as unknown as { __autoUpdateTimer?: ReturnType<typeof setTimeout> }).__autoUpdateTimer;
              if (timer) clearTimeout(timer);
              setShowUpdateBanner(false);
            }}
            className="text-emerald-300/50 hover:text-emerald-300 text-sm shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sleep reminder banner */}
      {showBanner && !bannerDismissed && (
        <div className="mx-5 mt-4 bg-amber-400/10 border border-amber-400/30 rounded-2xl px-4 py-3 flex items-start gap-3">
          <span className="text-2xl shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-amber-300 font-medium text-sm">
              昨天睡不到 7 小時！
            </p>
            <p className="text-amber-300/70 text-xs mt-0.5">
              今天記得早點上床，好好保護你的睡眠 💤
            </p>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-amber-300/50 hover:text-amber-300 text-sm shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Notification permission prompt */}
      {!notifDismissed && savedName && (
        <div className="mx-5 mt-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl shrink-0">🔔</span>
          <p className="text-indigo-300 text-sm flex-1">
            開啟通知，睡不夠時提醒你早點睡
          </p>
          <button
            onClick={handleEnableNotif}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 transition-colors"
          >
            開啟
          </button>
        </div>
      )}

      {/* Record list */}
      {/* Pull-to-refresh spinner (circular arrow) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        style={{
          top: isRefreshing ? 20 : Math.max(-40, pullDistance - 40),
          opacity: isRefreshing
            ? 1
            : Math.min(pullDistance / PULL_THRESHOLD, 1),
          willChange: "opacity",
        }}
      >
        <div className={isRefreshing ? "animate-[spin_1s_linear_infinite]" : ""}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-200"
          >
            <path d="M 23 14 A 9 9 0 1 1 14 5" />
            <path d="M 14 2 L 14 8 L 20 8" />
          </svg>
        </div>
      </div>

      <main
        ref={mainScrollRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto no-scrollbar px-5 py-3 relative"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: touchStartY.current === null ? "transform 0.2s ease-out" : undefined,
        }}
      >
        {records.length === 0 && (
          <div className="text-center text-slate-500 mt-20">
            <div className="text-4xl mb-3">📝</div>
            <p>還沒有紀錄</p>
            <p className="text-sm mt-1">點下方按鈕新增第一筆睡眠紀錄！</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {records.map((r) => (
            <div
              key={r.id}
              className="bg-slate-800/60 rounded-xl px-3 py-2 flex items-center gap-2.5"
            >
              {/* Date badge */}
              <div className="w-12 h-12 rounded-lg bg-slate-700/80 flex flex-col items-center justify-center shrink-0">
                <span className="text-base font-semibold text-slate-200 leading-none">
                  {formatShortDate(r.date)}
                </span>
                <span className="text-xs text-slate-400 leading-none mt-1">
                  {formatWeekday(r.date)}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-medium truncate">{r.person}</span>
                  {r.isMc && (
                    <span className="text-rose-500 text-lg leading-none">●</span>
                  )}
                  {r.wakeTime ? (
                    <span
                      className={`text-lg font-semibold ${durationColor(r.bedtime, r.wakeTime)}`}
                    >
                      {calcDuration(r.bedtime, r.wakeTime)}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-500">
                      待補起床時間
                    </span>
                  )}
                </div>
                <div className="text-lg text-slate-400">
                  🛏 {r.bedtime}
                  {r.wakeTime ? ` → ☀️ ${r.wakeTime}` : ""}
                </div>
              </div>

              {/* Edit / Delete (own records only) */}
              {r.person === savedName && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(r)}
                    className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-xl text-slate-300 rounded-lg transition-colors active:scale-95"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-rose-500/20 text-xl text-slate-400 hover:text-rose-400 rounded-lg transition-colors active:scale-95"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Add button - fixed at bottom */}
      <div className="px-5 pb-5 pt-2">
        <button
          onClick={() => {
            const defaults = smartDefaults();
            setFormDate(defaults.date);
            setFormBedtime(defaults.bedtime);
            setFormWakeTime(defaults.wakeTime);
            setFormIsMc(false);
            setEditingRecord(null);
            setShowForm(true);
          }}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl text-lg transition-colors active:scale-95"
        >
          + 新增睡眠紀錄
        </button>
      </div>

      {/* Overlay form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setShowForm(false);
              setEditingRecord(null);
            }}
          />
          {/* Form card */}
          <div className="relative w-full max-w-lg bg-slate-900 rounded-t-2xl px-5 py-5 animate-[slideUp_0.2s_ease-out]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">
                {editingRecord ? "編輯紀錄" : "新增紀錄"}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingRecord(null);
                }}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Date */}
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-400">日期</span>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
                />
              </label>

              {/* Bedtime & Wake time */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-slate-400">🛏 上床時間</span>
                  <input
                    type="time"
                    value={formBedtime}
                    onChange={(e) => setFormBedtime(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-slate-400">☀️ 起床時間</span>
                  <input
                    type="time"
                    value={formWakeTime}
                    onChange={(e) => setFormWakeTime(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
                  />
                </label>
              </div>

              {/* MC checkbox */}
              <button
                type="button"
                onClick={() => setFormIsMc((v) => !v)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors active:scale-[0.98] ${
                  formIsMc
                    ? "bg-rose-500/10 border-rose-500/50"
                    : "bg-slate-800 border-slate-700 hover:border-slate-600"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-sm ${
                    formIsMc
                      ? "bg-rose-500 text-white"
                      : "border border-slate-600"
                  }`}
                >
                  {formIsMc && "●"}
                </span>
                <span
                  className={`text-base ${
                    formIsMc ? "text-rose-300" : "text-slate-300"
                  }`}
                >
                  MC 生理期
                </span>
              </button>

              {/* Preview */}
              <div className="text-center py-2">
                {formBedtime && formWakeTime ? (
                  <>
                    <span className="text-sm text-slate-400">預估睡眠時長：</span>
                    <span
                      className={`text-lg font-bold ${durationColor(formBedtime, formWakeTime)}`}
                    >
                      {calcDuration(formBedtime, formWakeTime)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-400">
                    填入上床和起床時間後，自動計算睡眠時長
                  </span>
                )}
              </div>

              {/* Submit */}
              <button
                onClick={handleAddRecord}
                disabled={!formBedtime}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-4 rounded-2xl transition-colors active:scale-95"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room settings overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setShowSettings(false);
              setShowDeleteConfirm(false);
            }}
          />
          <div className="relative w-full max-w-xs bg-slate-900 rounded-2xl px-5 py-5">
            {!showDeleteConfirm ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">房間設定</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-slate-400 hover:text-white text-xl"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  房間 ID：{roomId}
                </p>

                {/* Divider */}
                <div className="border-t border-slate-800 my-4" />

                {/* Version info */}
                <div className="text-sm text-slate-400 space-y-1 mb-3">
                  <div>Version: {APP_VERSION}</div>
                  <div>Last Updated: {APP_LAST_UPDATED}</div>
                </div>

                <button
                  onClick={handleCheckUpdate}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-colors active:scale-95 mb-2"
                >
                  檢查更新
                </button>

                {showLatestMessage && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm text-center py-2 rounded-xl mb-3">
                    ✓ 目前已經是最新版本
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-slate-800 my-4" />

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold py-3 rounded-xl transition-colors active:scale-95"
                >
                  刪除此房間所有資料
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <span className="text-3xl">⚠️</span>
                  <h3 className="font-semibold text-lg mt-2">確定要刪除嗎？</h3>
                </div>
                <p className="text-sm text-slate-400 text-center mb-5">
                  此操作會永久刪除房間內所有人的睡眠紀錄，且無法復原。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDeleteRoom}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
                  >
                    確定刪除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

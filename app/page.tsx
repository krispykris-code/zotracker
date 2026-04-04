"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SleepRecord } from "@/lib/types";
import {
  calcDuration,
  durationColor,
  formatDate,
  smartDefaults,
  getPersonColor,
} from "@/lib/sleep";
import {
  registerSW,
  requestNotificationPermission,
  getYesterdaySleep,
  scheduleReminder,
} from "@/lib/notifications";

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

  // Notification states
  const [showBanner, setShowBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>("default");

  // ─── Init: load room & name ──────────────────────
  useEffect(() => {
    const rid = getRoomId();
    setRoomId(rid);
    const stored = localStorage.getItem("zotracker-name");
    if (stored) {
      setUserName(stored);
      setSavedName(stored);
    }
    // Register service worker
    registerSW();
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
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
    const granted = await requestNotificationPermission();
    setNotifPermission(granted ? "granted" : "denied");
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

  // ─── Create room ─────────────────────────────────
  const handleCreateRoom = useCallback(() => {
    const id = Math.random().toString(36).slice(2, 8);
    window.location.search = `?room=${id}`;
  }, []);

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
    });
    setShowForm(false);
    setEditingRecord(null);
  }, [roomId, savedName, formDate, formBedtime, formWakeTime, editingRecord]);

  // ─── Edit record (fill in wake time) ─────────────
  const handleEdit = useCallback((r: SleepRecord) => {
    setEditingRecord(r);
    setFormDate(r.date);
    setFormBedtime(r.bedtime);
    setFormWakeTime(r.wakeTime);
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

  // ─── Group records by date ───────────────────────
  const grouped = records.reduce(
    (acc, r) => {
      if (!acc[r.date]) acc[r.date] = [];
      acc[r.date].push(r);
      return acc;
    },
    {} as Record<string, SleepRecord[]>
  );

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
        <button
          onClick={handleCreateRoom}
          className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-6 rounded-2xl text-lg transition-colors active:scale-95"
        >
          建立房間
        </button>
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
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            🌙 ZoTracker
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Room: {roomId} · {savedName}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/stats?room=${roomId}`}
            className="bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-xl transition-colors active:scale-95"
          >
            📊 統計
          </Link>
          <button
            onClick={handleShare}
            className="bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-xl transition-colors active:scale-95"
          >
            邀請朋友
          </button>
        </div>
      </header>

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
      {notifPermission === "default" && savedName && (
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
      <main className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">
        {records.length === 0 && (
          <div className="text-center text-slate-500 mt-20">
            <div className="text-4xl mb-3">📝</div>
            <p>還沒有紀錄</p>
            <p className="text-sm mt-1">點下方按鈕新增第一筆睡眠紀錄！</p>
          </div>
        )}

        {Object.entries(grouped).map(([date, recs]) => (
          <div key={date} className="mb-6">
            <h2 className="text-sm font-medium text-slate-400 mb-2 px-1">
              {formatDate(date)}
            </h2>
            <div className="flex flex-col gap-2">
              {recs.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-800/60 rounded-2xl px-4 py-3 flex items-center gap-3"
                >
                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full ${getPersonColor(r.person)} flex items-center justify-center text-sm font-bold text-white shrink-0`}
                  >
                    {r.person[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-medium truncate">{r.person}</span>
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
                    <div className="text-lg text-slate-400 mt-0.5">
                      🛏 {r.bedtime}
                      {r.wakeTime ? ` → ☀️ ${r.wakeTime}` : ""}
                    </div>
                  </div>

                  {/* Edit / Delete (own records only) */}
                  {r.person === savedName && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEdit(r)}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-3 py-2 rounded-xl transition-colors active:scale-95"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="bg-slate-700 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-sm px-3 py-2 rounded-xl transition-colors active:scale-95"
                      >
                        刪除
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Add button */}
      {!showForm && (
        <div className="px-5 pb-5 pt-2">
          <button
            onClick={() => {
              const defaults = smartDefaults();
              setFormDate(defaults.date);
              setFormBedtime(defaults.bedtime);
              setFormWakeTime(defaults.wakeTime);
              setShowForm(true);
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl text-lg transition-colors active:scale-95"
          >
            + 新增睡眠紀錄
          </button>
        </div>
      )}

      {/* Add form (bottom sheet style) */}
      {showForm && (
        <div className="border-t border-slate-800 bg-slate-900 px-5 py-5">
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
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { collection, doc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SleepRecord } from "@/lib/types";
import { smartDefaults } from "@/lib/sleep";
import { getRoomId } from "@/lib/room";
import {
  registerSW,
  requestNotificationPermission,
  getYesterdaySleep,
  scheduleReminder,
} from "@/lib/notifications";
import { useRoomId } from "@/hooks/useRoomId";
import { useLocalStorageValue } from "@/hooks/useLocalStorageValue";
import { useRoomRecords } from "@/hooks/useRoomRecords";
import { useRoomHistory } from "@/hooks/useRoomHistory";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useToast } from "@/hooks/useToast";
import { Landing } from "@/components/Landing";
import { NameInput } from "@/components/NameInput";
import { AppHeader } from "@/components/AppHeader";
import { Toast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { UpdateBanner } from "@/components/UpdateBanner";
import { ReminderBanner } from "@/components/ReminderBanner";
import { NotifPrompt } from "@/components/NotifPrompt";
import { PullSpinner } from "@/components/PullSpinner";
import { RecordList } from "@/components/RecordList";
import { RecordForm, RecordFormValues } from "@/components/RecordForm";
import { SettingsModal } from "@/components/SettingsModal";

const EMPTY_FORM: RecordFormValues = {
  date: "",
  bedtime: "",
  wakeTime: "",
  isMc: false,
};

export default function Home() {
  const roomId = useRoomId();
  const [savedName, setSavedName] = useLocalStorageValue("zotracker-name");
  const [notifDismissed, setNotifDismissed] = useLocalStorageValue(
    "zotracker-notif-dismissed"
  );

  // Overlays & banners
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SleepRecord | null>(null);
  const [formInitial, setFormInitial] = useState<RecordFormValues>(EMPTY_FORM);
  const [showSettings, setShowSettings] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const mainScrollRef = useRef<HTMLElement>(null);
  const { toast, showToast } = useToast();
  const { records, loading, error } = useRoomRecords(roomId, "desc");
  const { addToHistory, removeFromHistory } = useRoomHistory();
  const update = useAppUpdate(showToast);
  const pull = usePullToRefresh(mainScrollRef);

  // Surface subscription problems without blocking cached data.
  useEffect(() => {
    if (error) showToast("error", "連線異常，顯示的可能是離線資料", 4000);
  }, [error, showToast]);

  // ─── Init: room persistence & service worker ──────
  useEffect(() => {
    const rid = getRoomId();
    if (!rid) {
      // If no room in URL, check localStorage for saved room → redirect
      const savedRoom = localStorage.getItem("zotracker-room");
      if (savedRoom) {
        window.location.search = `?room=${savedRoom}`;
        return;
      }
    } else {
      localStorage.setItem("zotracker-room", rid);
    }
    registerSW();
  }, []);

  // ─── Yesterday's sleep: banner (derived) & reminder ─
  const sleptUnder7h = useMemo(() => {
    if (!savedName || records.length === 0) return false;
    return getYesterdaySleep(records, savedName).sleptUnder7h;
  }, [records, savedName]);

  useEffect(() => {
    if (sleptUnder7h && savedName) scheduleReminder(savedName);
  }, [sleptUnder7h, savedName]);

  // ─── Handlers ──────────────────────────────────────
  const handleEnableNotif = useCallback(async () => {
    await requestNotificationPermission();
    setNotifDismissed("1");
  }, [setNotifDismissed]);

  const handleSaveName = useCallback(
    (name: string) => {
      setSavedName(name);
    },
    [setSavedName]
  );

  const handleGoHome = useCallback(() => {
    localStorage.removeItem("zotracker-room");
    window.location.href = window.location.origin;
  }, []);

  const handleCreateRoom = useCallback(() => {
    const id = Math.random().toString(36).slice(2, 8);
    addToHistory(id);
    localStorage.setItem("zotracker-room", id);
    window.location.search = `?room=${id}`;
  }, [addToHistory]);

  const handleJoinRoom = useCallback(
    (input: string) => {
      // Accept a pasted share link or a raw room ID
      const match = input.match(/[?&]room=([^&]+)/);
      const id = match ? match[1] : input;
      addToHistory(id);
      localStorage.setItem("zotracker-room", id);
      window.location.search = `?room=${id}`;
    },
    [addToHistory]
  );

  const openAddForm = useCallback(() => {
    setFormInitial({ ...smartDefaults(), isMc: false });
    setEditingRecord(null);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((r: SleepRecord) => {
    setEditingRecord(r);
    setFormInitial({
      date: r.date,
      bedtime: r.bedtime,
      wakeTime: r.wakeTime,
      isMc: r.isMc ?? false,
    });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingRecord(null);
  }, []);

  const handleSaveRecord = useCallback(
    (values: RecordFormValues) => {
      if (!roomId || !savedName) return;
      const newDocId = `${values.date}_${savedName}`;

      // Fire-and-forget: with offline persistence, setDoc only resolves after
      // the server ack — awaiting it would freeze the form when offline. The
      // local cache reflects the write immediately (latency compensation).
      const write = async () => {
        // If editing and date changed, delete old record first
        if (editingRecord && editingRecord.id !== newDocId) {
          await deleteDoc(doc(db, "rooms", roomId, "records", editingRecord.id));
        }
        await setDoc(doc(db, "rooms", roomId, "records", newDocId), {
          date: values.date,
          bedtime: values.bedtime,
          wakeTime: values.wakeTime,
          person: savedName,
          createdAt: editingRecord?.createdAt ?? Date.now(),
          isMc: values.isMc,
        });
      };
      write().catch(() => showToast("error", "儲存失敗，請稍後再試", 4000));
      closeForm();
    },
    [roomId, savedName, editingRecord, closeForm, showToast]
  );

  const confirmDelete = useCallback(() => {
    if (!roomId || !deleteTarget) return;
    deleteDoc(doc(db, "rooms", roomId, "records", deleteTarget)).catch(() =>
      showToast("error", "刪除失敗，請稍後再試", 4000)
    );
    setDeleteTarget(null);
  }, [roomId, deleteTarget, showToast]);

  const shareLink = roomId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}?room=${roomId}`
    : "";

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "ZoTracker",
          text: "一起來記錄睡眠吧！",
          url: shareLink,
        });
      } else {
        await navigator.clipboard.writeText(shareLink);
        showToast("complete", "已複製連結！傳給朋友就能一起記錄 ✌️", 3000);
      }
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  }, [shareLink, showToast]);

  // Destructive: keep awaiting so we only navigate away on success.
  const handleDeleteRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const snap = await getDocs(collection(db, "rooms", roomId, "records"));
      const deletes = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletes);
      removeFromHistory(roomId);
      localStorage.removeItem("zotracker-room");
      setShowSettings(false);
      window.location.href = window.location.origin;
    } catch {
      showToast("error", "刪除失敗，請檢查網路後再試", 4000);
    }
  }, [roomId, removeFromHistory, showToast]);

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  if (!roomId) {
    return <Landing onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
  }

  if (!savedName) {
    return <NameInput onSave={handleSaveName} />;
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col max-w-lg mx-auto w-full">
      <Toast message={toast} />

      <AppHeader
        title={
          <button
            onClick={handleGoHome}
            className="text-xl font-bold flex items-center gap-2 hover:text-indigo-400 transition-colors"
          >
            🌙 ZoTracker
          </button>
        }
        subtitle={`Room: ${roomId} · ${savedName}`}
        actions={
          <div className="flex gap-1.5">
            <Link
              href={`/calendar?room=${roomId}`}
              aria-label="行事曆"
              className="bg-slate-800 hover:bg-slate-700 text-base px-3 py-2 rounded-xl transition-colors active:scale-95"
            >
              📅
            </Link>
            <Link
              href={`/stats?room=${roomId}`}
              aria-label="睡眠統計"
              className="bg-slate-800 hover:bg-slate-700 text-base px-3 py-2 rounded-xl transition-colors active:scale-95"
            >
              📊
            </Link>
            <button
              onClick={handleShare}
              aria-label="分享房間連結"
              className="bg-slate-800 hover:bg-slate-700 text-base px-3 py-2 rounded-xl transition-colors active:scale-95"
            >
              🔗
            </button>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="房間設定"
              className="bg-slate-800 hover:bg-slate-700 text-base px-3 py-2 rounded-xl transition-colors active:scale-95"
            >
              ⚙️
            </button>
          </div>
        }
      />

      {update.showUpdateBanner && (
        <UpdateBanner
          onUpdate={update.applyUpdate}
          onDismiss={update.dismissUpdateBanner}
        />
      )}

      {sleptUnder7h && !bannerDismissed && (
        <ReminderBanner onDismiss={() => setBannerDismissed(true)} />
      )}

      {!notifDismissed && <NotifPrompt onEnable={handleEnableNotif} />}

      <PullSpinner
        pullDistance={pull.pullDistance}
        isRefreshing={pull.isRefreshing}
        threshold={pull.threshold}
      />

      <main
        ref={mainScrollRef}
        {...pull.bind}
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 py-3 relative"
        style={pull.containerStyle}
      >
        {loading ? (
          <LoadingSpinner />
        ) : (
          <RecordList
            records={records}
            ownName={savedName}
            onEdit={openEditForm}
            onDelete={(id) => setDeleteTarget(id)}
          />
        )}
      </main>

      {/* Add button - fixed at bottom */}
      <div className="px-5 pb-5 pt-2">
        <button
          onClick={openAddForm}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl text-lg transition-colors active:scale-95"
        >
          + 新增睡眠紀錄
        </button>
      </div>

      {showForm && (
        <RecordForm
          initial={formInitial}
          isEditing={editingRecord !== null}
          onSave={handleSaveRecord}
          onClose={closeForm}
        />
      )}

      {showSettings && (
        <SettingsModal
          roomId={roomId}
          showLatestMessage={update.showLatestMessage}
          onCheckUpdate={update.checkUpdate}
          onDeleteRoom={handleDeleteRoom}
          onClose={() => setShowSettings(false)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="確定要刪除嗎？"
          message="這筆睡眠紀錄會被永久刪除。"
          confirmLabel="確定刪除"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

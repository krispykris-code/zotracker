"use client";

import type { SleepRecord } from "@/lib/types";
import { RecordCard } from "./RecordCard";

export function RecordList({
  records,
  ownName,
  onEdit,
  onDelete,
}: {
  records: SleepRecord[];
  ownName: string;
  onEdit: (r: SleepRecord) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      {records.length === 0 && (
        <div className="text-center text-slate-400 mt-20">
          <div className="text-4xl mb-3">📝</div>
          <p>還沒有紀錄</p>
          <p className="text-sm mt-1">點下方按鈕新增第一筆睡眠紀錄！</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {records.map((r) => (
          <RecordCard
            key={r.id}
            record={r}
            isOwn={r.person === ownName}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  );
}

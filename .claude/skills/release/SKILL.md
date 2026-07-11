---
name: release
description: ZoTracker 一鍵釋出流程。當使用者說「釋出」「發版」「release」「bump 版本」「更新版本號」「上線」「推新版」時使用。自動同步三處版本號（APP_VERSION、APP_LAST_UPDATED、sw.js CACHE_NAME）、跑四道品質關卡、commit、tag、push，並帶使用者走完手動步驟。
---

# ZoTracker 一鍵釋出

## 流程

1. **確認改動內容**：先跑 `git status` 與 `git log --oneline -5`，向鄭醫師摘要這次要釋出的改動。工作區必須乾淨（所有改動已 commit）、在 main 分支上，否則先處理。

2. **確認版本號**：讀 `lib/version.ts` 的現值，預設建議 minor+1（例如 1.6 → 1.7）。
   - 若這次改動**不是使用者可見的**（純重構、文件、測試），建議不 bump、直接 push 即可（使用者會靜默拿到新 code，不會看到更新橫幅）——跟鄭醫師確認。

3. **執行釋出**（Windows 環境，npm 需包裝）：
   ```bash
   cmd //c "npm run release"           # 自動 minor+1
   cmd //c "npm run release -- 1.8"    # 或指定版本
   ```
   腳本會自動：
   - 同步 `lib/version.ts`（APP_VERSION + APP_LAST_UPDATED=今天）與 `public/sw.js`（CACHE_NAME）
   - 依序跑 lint → typecheck → test → build
   - build 遇到 EBUSY 會自動重試 2 次（Dropbox 鎖 `.next` 的已知問題，非程式錯誤）
   - 任一關卡失敗 → 自動還原版本檔並中止，此時修好問題再重跑即可
   - 全過 → commit「Release vX.Y」+ tag + push，Vercel 自動部署

4. **帶完手動清單**：腳本結尾會印出手動檢查清單（firestore.rules 要貼 Console、logo 改了要重生 icons、開 zotracker.vercel.app 確認），逐項帶鄭醫師完成。

5. **最終驗證**：提醒鄭醫師用手機開 ZoTracker PWA——應出現更新橫幅，點「立即更新」後，設定（⚙️）內的 Version 應顯示新版號。

## 注意

- 只在 main 上釋出；feature branch 的改動先 merge 進 main。
- 版本號格式為 `X.Y`（如 1.6），不用三段式。
- 若想先驗證腳本行為不真的釋出：`cmd //c "npm run release -- --dry-run"`。

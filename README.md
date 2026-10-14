# 偶們家記帳

阿寶和草莓兩個人的生活帳（跟滷味店、OUR FINANCE 分開）。iPhone 優先，淺色。

- 網站：GitHub Pages（push 到 main 自動部署）
- 資料：跟叫蛋記帳共用同一個免費 Supabase 專案，表格都用 `hl_` 開頭，只有 `hl_members` 裡的帳號看得到
- 帳號：跟叫蛋記帳同一組（阿寶、草莓），可以設定 Face ID 登入

## 功能
- 主畫面：這個月收入／支出／收支、跟上個月比的支出趨勢、最近記的
- 記一筆：金額、名稱、分類、日期、每月重複（房貸、車貸…）、備註；可修改、刪除（可復原）
- 列表：週一開頭的月曆，每天的金額，點一天看那天的明細
- 圖表：支出／收入的分類圓餅圖
- 設定：每月固定（停止／恢復）、分類（新增、改名、換圖示顏色、不用了）、Face ID、登出
- LINE 群組：尚未開放

## 開發
```
npm ci
npm run typecheck && npm test && npm run build
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e   # 本機 Supabase 替身（PGlite + 真的 migration）
```

## 資料庫
- `supabase/migrations/`：用 Supabase MCP `apply_migration` 套用到正式專案
- `supabase/setup-members.sql`：把阿寶、草莓加入（只需要跑一次）

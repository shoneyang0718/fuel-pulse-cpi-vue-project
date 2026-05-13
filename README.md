# 油價脈動 CPI

使用 Express 與 SQLite 打造的個人化油價 CPI 追蹤網站。

## 本機啟動
1. `npm install`
2. `npm start`
3. 開啟 `http://localhost:3000`

## 功能
- 新增日期、品項名稱、價格
- 以表格呈現歷史紀錄
- 依日期或品項名稱篩選
- SQLite 本機持久化

## 專案結構
- `server.js`：Express API + SQLite 設定
- `public/`：前端檔案
- `docs/openspec.md`：OpenSpec 實作紀錄模板

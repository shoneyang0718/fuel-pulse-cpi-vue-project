# OpenSpec 紀錄 - 油價脈動 CPI

## 商品介紹
本網站追蹤零售油價（汽油與柴油），建立個人化 CPI 的通膨視角。

## 個人選擇理由
油價波動快且影響日常通勤支出，容易觀察也具代表性。

## 目標
建立簡單的物價追蹤網站，使用者可新增日期、品項與價格，並瀏覽歷史紀錄與篩選結果。

## 技術堆疊
- 前端：HTML、CSS、JavaScript（不使用框架）
- 後端：Node.js + Express
- 資料庫：SQLite

## 本機啟動
1. 執行 `npm install`。
2. 執行 `npm start`。
3. 在瀏覽器開啟 `http://localhost:3000`。

## API 設計
- `GET /api/prices?search=`：回傳所有紀錄，可用品項或日期篩選。
- `POST /api/prices`：建立一筆含 `date`、`item`、`price` 的紀錄。

## 資料庫結構
資料表：`prices`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `date` TEXT NOT NULL
- `item` TEXT NOT NULL
- `price` REAL NOT NULL
- `created_at` TEXT DEFAULT datetime('now')

## 前端流程
- 送出表單新增一筆價格紀錄。
- 以表格查看與搜尋歷史資料。
- 重新整理後仍保留資料（SQLite 持久化）。

## 截圖清單（放入 OpenSpec）
- 終端機啟動伺服器
- 表單輸入新增紀錄
- 表格查詢與搜尋結果

## 關鍵程式片段建議
- 前端 fetch 呼叫（`public/app.js`）
- Express API 路由（`server.js`）
- SQLite 新增/查詢（`server.js`）

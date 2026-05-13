const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "prices_zh.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("資料庫開啟失敗：", err.message);
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function toNumber(text) {
  const number = Number(String(text).replace(/[^\d.]/g, ""));
  return Number.isNaN(number) ? null : number;
}

function rocToIso(rocDate) {
  const parts = String(rocDate).split("/").map(Number);
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }

  const [rocYear, month, day] = parts;
  const year = rocYear + 1911;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

async function fetchCpcHistory(
  url = "https://www.cpc.com.tw/historyprice.aspx?n=2890"
) {
  const response = await axios.get(url, { responseType: "text" });
  const $ = cheerio.load(response.data);
  const rows = [];

  $("tr").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .map((__, td) => $(td).text().replace(/\s+/g, " ").trim())
      .get();

    if (cells.length >= 5 && /^\d{3}\/\d{2}\/\d{2}$/.test(cells[0])) {
      rows.push(cells.slice(0, 5));
    }
  });

  if (!rows.length) {
    throw new Error("找不到歷史油價表格資料。");
  }

  return rows.map(([rocDate, r92, r95, r98, diesel]) => ({
    rocDate,
    date: rocToIso(rocDate),
    unleaded92: toNumber(r92),
    unleaded95: toNumber(r95),
    unleaded98: toNumber(r98),
    diesel: toNumber(diesel)
  }));
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ changes: this.changes });
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

async function saveCpcHistory(rows) {
  const cleaned = rows.filter((row) => row.date);
  if (!cleaned.length) {
    return 0;
  }

  const insertSql =
    "INSERT OR IGNORE INTO cpc_history (date, roc_date, unleaded92, unleaded95, unleaded98, diesel) VALUES (?, ?, ?, ?, ?, ?)";
  let inserted = 0;

  for (const row of cleaned) {
    const result = await runAsync(insertSql, [
      row.date,
      row.rocDate,
      row.unleaded92,
      row.unleaded95,
      row.unleaded98,
      row.diesel
    ]);
    inserted += result.changes;
  }

  return inserted;
}

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function subtractMonths(date, months) {
  const copy = new Date(date.getTime());
  copy.setMonth(copy.getMonth() - months);
  return copy;
}

function sortByDateDesc(rows) {
  return [...rows].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function findRowOnOrBefore(sortedRows, targetDate) {
  return sortedRows.find((row) => row.date <= targetDate) || null;
}

function buildCpcPriceRows(cpcRows, weeks) {
  const sorted = sortByDateDesc(cpcRows.filter((row) => row.date));
  const dates = [];
  const seen = new Set();

  for (const row of sorted) {
    if (!seen.has(row.date)) {
      dates.push(row.date);
      seen.add(row.date);
      if (dates.length >= weeks) {
        break;
      }
    }
  }

  const rowMap = new Map(sorted.map((row) => [row.date, row]));
  const fuelMap = [
    { key: "unleaded92", label: "92 無鉛" },
    { key: "unleaded95", label: "95 無鉛" },
    { key: "unleaded98", label: "98 無鉛" },
    { key: "diesel", label: "柴油" }
  ];

  const priceRows = [];
  dates.forEach((date) => {
    const row = rowMap.get(date);
    if (!row) {
      return;
    }

    fuelMap.forEach((fuel) => {
      const price = Number(row[fuel.key]);
      if (!Number.isNaN(price)) {
        priceRows.push({ date, item: fuel.label, price });
      }
    });
  });

  return { dates, priceRows };
}

async function syncPricesFromCpc(weeks = 3) {
  const data = await fetchCpcHistory();
  await saveCpcHistory(data);

  const { dates, priceRows } = buildCpcPriceRows(data, weeks);
  if (!priceRows.length) {
    return { dates: [], inserted: 0 };
  }

  await runAsync("DELETE FROM prices");

  const insertSql = "INSERT INTO prices (date, item, price) VALUES (?, ?, ?)";
  for (const row of priceRows) {
    await runAsync(insertSql, [row.date, row.item, row.price]);
  }

  return { dates, inserted: priceRows.length };
}

async function initDatabase() {
  await runAsync(
    `CREATE TABLE IF NOT EXISTS prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item TEXT NOT NULL,
      price REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await runAsync(
    `CREATE TABLE IF NOT EXISTS cpc_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      roc_date TEXT NOT NULL,
      unleaded92 REAL,
      unleaded95 REAL,
      unleaded98 REAL,
      diesel REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  const row = await getAsync("SELECT COUNT(*) AS count FROM prices");
  if (!row || row.count === 0) {
    const result = await syncPricesFromCpc(3);
    if (result.inserted > 0) {
      console.log("已同步真實油價資料到 prices。", result.dates.join(", "));
    }
  }
}

initDatabase().catch((err) => {
  console.error("初始化資料庫失敗：", err.message);
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/cpc-history", async (req, res) => {
  try {
    const data = await fetchCpcHistory();
    const inserted = await saveCpcHistory(data);

    const rows = await allAsync(
      "SELECT date, roc_date AS rocDate, unleaded92, unleaded95, unleaded98, diesel FROM cpc_history ORDER BY date DESC"
    );

    res.json({ inserted, rows });
  } catch (err) {
    console.error("抓取中油歷史油價失敗：", err.message);
    res.status(500).json({ error: "抓取中油歷史油價失敗。" });
  }
});

app.post("/api/prices/sync-cpc", async (req, res) => {
  const weeks = Number(req.query.weeks || 3);
  if (Number.isNaN(weeks) || weeks < 1 || weeks > 12) {
    return res.status(400).json({ error: "weeks 需介於 1 到 12。" });
  }

  try {
    const result = await syncPricesFromCpc(weeks);
    res.json(result);
  } catch (err) {
    console.error("同步真實油價失敗：", err.message);
    res.status(500).json({ error: "同步真實油價失敗。" });
  }
});

app.get("/api/inflation", async (req, res) => {
  const dateInput = String(req.query.date || "").trim();
  const type = String(req.query.type || "").trim();
  const validTypes = ["unleaded92", "unleaded95", "unleaded98", "diesel"];

  if (!dateInput || !validTypes.includes(type)) {
    return res.status(400).json({ error: "請提供正確的日期與油品種類。" });
  }

  const targetDate = parseIsoDate(dateInput);
  if (!targetDate) {
    return res.status(400).json({ error: "日期格式需為 YYYY-MM-DD。" });
  }

  try {
    const data = await fetchCpcHistory();
    await saveCpcHistory(data);
    const cleaned = data.filter((row) => row.date);
    const sorted = sortByDateDesc(cleaned);

    if (!sorted.length) {
      return res.status(404).json({ error: "查無油價資料。" });
    }

    const latestDate = sorted[0].date;
    const earliestDate = sorted[sorted.length - 1].date;
    const startDate = formatIsoDate(subtractMonths(targetDate, 3));
    const endRow = findRowOnOrBefore(sorted, dateInput);
    let startRow = findRowOnOrBefore(sorted, startDate);
    const noteParts = [];

    if (!endRow) {
      return res.status(404).json({
        error: `查無資料，請選擇 ${earliestDate} 至 ${latestDate} 之間日期。`
      });
    }

    if (endRow.date !== dateInput) {
      noteParts.push(`查詢日期沒有資料，已改用最近日期 ${endRow.date}。`);
    }

    if (!startRow) {
      startRow = sorted[sorted.length - 1];
      noteParts.push(`資料不足三個月，已改用最早日期 ${startRow.date} 計算。`);
    }

    if (!endRow || !startRow) {
      return res
        .status(404)
        .json({ error: "查無足夠資料，請稍後再試。" });
    }

    if (endRow[type] == null || startRow[type] == null) {
      return res
        .status(404)
        .json({ error: "查無足夠資料，請改用其他日期或油品。" });
    }

    const startPrice = Number(startRow[type]);
    const endPrice = Number(endRow[type]);

    if (Number.isNaN(startPrice) || Number.isNaN(endPrice)) {
      return res.status(500).json({ error: "價格資料異常，請稍後再試。" });
    }

    if (startPrice === 0) {
      return res
        .status(400)
        .json({ error: "起始價格為 0，無法計算通膨率。" });
    }

    const inflationRate = ((endPrice - startPrice) / startPrice) * 100;

    res.json({
      type,
      startDate: startRow.date,
      endDate: endRow.date,
      startPrice,
      endPrice,
      inflationRate,
      months: 3,
      note: noteParts.length ? noteParts.join(" ") : null
    });
  } catch (err) {
    console.error("計算通膨率失敗：", err.message);
    res.status(500).json({ error: "計算通膨率失敗。" });
  }
});

app.get("/api/prices", (req, res) => {
  const search = String(req.query.search || "").trim();
  let sql = "SELECT id, date, item, price FROM prices";
  const params = [];

  if (search) {
    sql += " WHERE item LIKE ? OR date LIKE ?";
    const like = `%${search}%`;
    params.push(like, like);
  }

  sql += " ORDER BY date DESC, id DESC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("讀取價格失敗：", err.message);
      return res.status(500).json({ error: "資料庫查詢失敗。" });
    }
    res.json(rows);
  });
});

app.post("/api/prices", (req, res) => {
  const date = String(req.body.date || "").trim();
  const item = String(req.body.item || "").trim();
  const price = Number(req.body.price);

  if (!date || !item || Number.isNaN(price)) {
    return res.status(400).json({
      error: "請提供日期、品項與價格。"
    });
  }

  const sql = "INSERT INTO prices (date, item, price) VALUES (?, ?, ?)";
  db.run(sql, [date, item, price], function (err) {
    if (err) {
      console.error("寫入價格失敗：", err.message);
      return res.status(500).json({ error: "資料庫寫入失敗。" });
    }
    res.status(201).json({ id: this.lastID, date, item, price });
  });
});

app.listen(PORT, () => {
  console.log(`伺服器啟動：http://localhost:${PORT}`);
});

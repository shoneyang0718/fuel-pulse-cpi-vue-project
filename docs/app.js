const form = document.querySelector("#entry-form");
const dateInput = document.querySelector("#date");
const itemInput = document.querySelector("#item");
const priceInput = document.querySelector("#price");
const searchInput = document.querySelector("#search");
const tableBody = document.querySelector("#price-rows");
const emptyState = document.querySelector("#empty-state");
const statusEl = document.querySelector("#status");
const statCount = document.querySelector("#stat-count");
const statLatest = document.querySelector("#stat-latest");
const statAverage = document.querySelector("#stat-average");
const inflationForm = document.querySelector("#inflation-form");
const inflationDate = document.querySelector("#inflation-date");
const fuelType = document.querySelector("#fuel-type");
const inflationResult = document.querySelector("#inflation-result");
const isStaticPreview = window.location.hostname.endsWith("github.io");

let searchTimer = null;

const fuelLabels = {
  unleaded92: "92 無鉛",
  unleaded95: "95 無鉛",
  unleaded98: "98 無鉛",
  diesel: "柴油"
};

const sampleCpcHistory = [
  {
    date: "2026-05-11",
    unleaded92: 32.4,
    unleaded95: 33.9,
    unleaded98: 35.9,
    diesel: 31
  },
  {
    date: "2026-05-04",
    unleaded92: 32.4,
    unleaded95: 33.9,
    unleaded98: 35.9,
    diesel: 31
  },
  {
    date: "2026-04-27",
    unleaded92: 32.4,
    unleaded95: 33.9,
    unleaded98: 35.9,
    diesel: 31
  },
  {
    date: "2026-04-20",
    unleaded92: 32.4,
    unleaded95: 33.9,
    unleaded98: 35.9,
    diesel: 31
  },
  {
    date: "2026-04-13",
    unleaded92: 32.4,
    unleaded95: 33.9,
    unleaded98: 35.9,
    diesel: 31
  },
  {
    date: "2026-04-06",
    unleaded92: 32.4,
    unleaded95: 33.9,
    unleaded98: 35.9,
    diesel: 31
  },
  {
    date: "2026-03-30",
    unleaded92: 32.4,
    unleaded95: 33.9,
    unleaded98: 35.9,
    diesel: 31
  }
];

const samplePrices = [
  { date: "2026-05-11", item: "92 無鉛", price: 32.4 },
  { date: "2026-05-11", item: "95 無鉛", price: 33.9 },
  { date: "2026-05-11", item: "98 無鉛", price: 35.9 },
  { date: "2026-05-11", item: "柴油", price: 31 },
  { date: "2026-05-04", item: "92 無鉛", price: 32.4 },
  { date: "2026-05-04", item: "95 無鉛", price: 33.9 },
  { date: "2026-05-04", item: "98 無鉛", price: 35.9 },
  { date: "2026-05-04", item: "柴油", price: 31 },
  { date: "2026-04-27", item: "92 無鉛", price: 32.4 },
  { date: "2026-04-27", item: "95 無鉛", price: 33.9 },
  { date: "2026-04-27", item: "98 無鉛", price: 35.9 },
  { date: "2026-04-27", item: "柴油", price: 31 }
];

function sortByDateDesc(rows) {
  return [...rows].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function findRowOnOrBefore(sortedRows, targetDate) {
  return sortedRows.find((row) => row.date <= targetDate) || null;
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

function computeInflationFromRows(rows, dateInput, type) {
  const sorted = sortByDateDesc(rows.filter((row) => row.date));
  if (!sorted.length) {
    return { error: "查無油價資料。" };
  }

  const targetDate = parseIsoDate(dateInput);
  if (!targetDate) {
    return { error: "日期格式需為 YYYY-MM-DD。" };
  }

  const latestDate = sorted[0].date;
  const earliestDate = sorted[sorted.length - 1].date;
  const startDate = formatIsoDate(subtractMonths(targetDate, 3));
  const endRow = findRowOnOrBefore(sorted, dateInput);
  let startRow = findRowOnOrBefore(sorted, startDate);
  const noteParts = [];

  if (!endRow) {
    return {
      error: `查無資料，請選擇 ${earliestDate} 至 ${latestDate} 之間日期。`
    };
  }

  if (endRow.date !== dateInput) {
    noteParts.push(`查詢日期沒有資料，已改用最近日期 ${endRow.date}。`);
  }

  if (!startRow) {
    startRow = sorted[sorted.length - 1];
    noteParts.push(`資料不足三個月，已改用最早日期 ${startRow.date} 計算。`);
  }

  const startPrice = Number(startRow[type]);
  const endPrice = Number(endRow[type]);

  if (Number.isNaN(startPrice) || Number.isNaN(endPrice)) {
    return { error: "價格資料異常，請稍後再試。" };
  }

  if (startPrice === 0) {
    return { error: "起始價格為 0，無法計算通膨率。" };
  }

  const inflationRate = ((endPrice - startPrice) / startPrice) * 100;

  return {
    type,
    startDate: startRow.date,
    endDate: endRow.date,
    startPrice,
    endPrice,
    inflationRate,
    months: 3,
    note: noteParts.length ? noteParts.join(" ") : null
  };
}

function formatPrice(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return "NT$ --";
  }
  return `NT$ ${number.toFixed(1)}`;
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type || ""}`.trim();
}

function showInflationMessage(message, type) {
  inflationResult.textContent = message;
  inflationResult.className = `inflation-result ${type || ""}`.trim();
}

function renderInflationResult(data) {
  const rate = Number(data.inflationRate);
  if (Number.isNaN(rate)) {
    showInflationMessage("計算結果異常。", "error");
    return;
  }

  const label = fuelLabels[data.type] || data.type;
  const sign = rate > 0 ? "+" : "";
  const noteLine = data.note
    ? `<p class="inflation-note">${data.note}</p>`
    : "";
  inflationResult.className = "inflation-result success";
  inflationResult.innerHTML = `
    <p class="inflation-title">${label} 近三個月通膨率</p>
    <p class="inflation-rate">${sign}${rate.toFixed(2)}%</p>
    <p class="inflation-meta">起始 ${data.startDate} ${formatPrice(
      data.startPrice
    )} → 結束 ${data.endDate} ${formatPrice(data.endPrice)}</p>
    ${noteLine}
  `;
}

function renderRows(items) {
  tableBody.innerHTML = "";

  if (!items.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  items.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.className = "row-animate";
    tr.style.animationDelay = `${index * 40}ms`;

    const dateCell = document.createElement("td");
    dateCell.textContent = row.date;

    const itemCell = document.createElement("td");
    itemCell.textContent = row.item;

    const priceCell = document.createElement("td");
    priceCell.textContent = formatPrice(row.price);

    tr.append(dateCell, itemCell, priceCell);
    tableBody.appendChild(tr);
  });
}

function updateStats(items) {
  statCount.textContent = items.length;

  if (!items.length) {
    statLatest.textContent = "--";
    statAverage.textContent = "--";
    return;
  }

  const latest = items[0];
  statLatest.textContent = formatPrice(latest.price);

  const total = items.reduce((sum, row) => sum + Number(row.price || 0), 0);
  const avg = total / items.length;
  statAverage.textContent = formatPrice(avg);
}

async function loadPrices() {
  if (isStaticPreview) {
    const search = searchInput.value.trim();
    let items = samplePrices;
    if (search) {
      const term = search.toLowerCase();
      items = samplePrices.filter((row) =>
        row.item.toLowerCase().includes(term)
          ? true
          : row.date.includes(search)
      );
    }
    renderRows(items);
    updateStats(items);
    return;
  }

  const url = new URL("/api/prices", window.location.origin);
  const search = searchInput.value.trim();
  if (search) {
    url.searchParams.set("search", search);
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("讀取價格失敗。");
  }

  const data = await res.json();
  renderRows(data);
  updateStats(data);
}

async function handleSubmit(event) {
  event.preventDefault();
  showStatus("", "");

  if (isStaticPreview) {
    showStatus("GitHub Pages 為靜態展示，無法儲存資料。", "error");
    return;
  }

  const payload = {
    date: dateInput.value,
    item: itemInput.value.trim(),
    price: Number(priceInput.value)
  };

  if (!payload.date || !payload.item || Number.isNaN(payload.price)) {
    showStatus("請填寫日期、品項與價格。", "error");
    return;
  }

  const res = await fetch("/api/prices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    showStatus("儲存失敗，請稍後再試。", "error");
    return;
  }

  form.reset();
  dateInput.valueAsDate = new Date();
  showStatus("已儲存，清單已更新。", "success");
  await loadPrices();
}

async function handleInflationSubmit(event) {
  event.preventDefault();
  showInflationMessage("計算中...", "pending");

  const date = inflationDate.value;
  const type = fuelType.value;

  if (!date || !type) {
    showInflationMessage("請選擇日期與油品。", "error");
    return;
  }

  if (isStaticPreview) {
    const payload = computeInflationFromRows(sampleCpcHistory, date, type);
    if (payload.error) {
      showInflationMessage(payload.error, "error");
      return;
    }
    renderInflationResult(payload);
    return;
  }

  const url = new URL("/api/inflation", window.location.origin);
  url.searchParams.set("date", date);
  url.searchParams.set("type", type);

  const res = await fetch(url);
  let payload = null;
  try {
    payload = await res.json();
  } catch (err) {
    payload = null;
  }

  if (!res.ok) {
    showInflationMessage(payload?.error || "計算失敗。", "error");
    return;
  }

  renderInflationResult(payload);
}

form.addEventListener("submit", handleSubmit);
inflationForm.addEventListener("submit", handleInflationSubmit);

searchInput.addEventListener("input", () => {
  if (searchTimer) {
    window.clearTimeout(searchTimer);
  }
  searchTimer = window.setTimeout(() => {
    loadPrices().catch((err) => {
      console.error(err);
      showStatus("讀取資料失敗。", "error");
    });
  }, 200);
});

dateInput.valueAsDate = new Date();
inflationDate.valueAsDate = new Date();

loadPrices().catch((err) => {
  console.error(err);
  showStatus("讀取資料失敗。", "error");
});

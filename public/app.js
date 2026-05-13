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

let searchTimer = null;

const fuelLabels = {
  unleaded92: "92 無鉛",
  unleaded95: "95 無鉛",
  unleaded98: "98 無鉛",
  diesel: "柴油"
};

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

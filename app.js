// ===============================
// €asy Change BG – app.js
// Етап 1 + 2 + 3 + Reset + Language (BG/EN)
// ===============================

const RATE = 1.95583;
const EPS = 1e-9;

// false = препоръчваме ресто в евро (e4 авто), true = потребителят разделя евро/лева
let manualReturnMode = false;

// -------------------------------
// 0) ЕЗИЦИ
// -------------------------------
const I18N = {
  bg: {
    app_title: "€asy Change BG",
    label_e1: "Цена (€)",
    label_b1: "Цена (лв)",
    label_e2: "Платено (€)",
    label_b2: "Доплащане (лв)",
    label_e4: "Ресто (€)",
    label_b4: "Ресто (лв)",
    btn_video: "Ресурси",
    btn_reset: "Нулиране",
    btn_donate: "Дари",
    remaining_prefix: "Остава",
    change_prefix: "Ресто",
  },
  en: {
    app_title: "€asy Change BG",
    label_e1: "Price (€)",
    label_b1: "Price (BGN)",
    label_e2: "Paid (€)",
    label_b2: "Top-up (BGN)",
    label_e4: "Change (€)",
    label_b4: "Change (BGN)",
    btn_video: "Resources",
    btn_reset: "Reset",
    btn_donate: "Donate",
    remaining_prefix: "To Pay",
    change_prefix: "Change",
  }
};

let currentLang = localStorage.getItem("ecbg_lang") || "bg";

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || (I18N.bg[key] ?? key);
}

function applyLanguageToStaticText() {
  document.documentElement.lang = currentLang;

  const nodes = document.querySelectorAll("[data-i18n]");
  nodes.forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
}

function setLanguage(lang) {
  currentLang = (lang === "en") ? "en" : "bg";
  localStorage.setItem("ecbg_lang", currentLang);
  applyLanguageToStaticText();
  updateAll(); // за да се преведат динамичните hint-ове
}

// -------------------------------
// 1) HTML елементи
// -------------------------------
const priceEur   = document.getElementById("price-eur");     // e1 (editable)
const priceBgn   = document.getElementById("price-bgn");     // b1 (disabled)

const paidEur    = document.getElementById("paid-eur");      // e2 (editable)
const paidBgn    = document.getElementById("paid-bgn");      // b2 (editable)

const returnEur  = document.getElementById("return-eur");    // e4 (editable)
const returnBgn  = document.getElementById("return-bgn");    // b4 (disabled)

const paidEurHint   = document.getElementById("paid-eur-hint");
const paidBgnHint   = document.getElementById("paid-bgn-hint");
const returnEurHint = document.getElementById("return-eur-hint");
const returnBgnHint = document.getElementById("return-bgn-hint");

const resetBtn = document.getElementById("reset-btn");
const langBgBtn = document.getElementById("lang-bg");
const langEnBtn = document.getElementById("lang-en");

// -------------------------------
// 2) Помощни функции
// -------------------------------
function parseMoney(text) {
  const s = String(text ?? "")
    .trim()
    .replace(",", ".")
    .replace(/[^0-9.\-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function round2Bankers(x) {
  const scaled = x * 100;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;

  if (Math.abs(diff) < 1e-12) return floor / 100;
  if (Math.abs(diff - 0.5) > 1e-12) return Math.round(scaled) / 100;

  const isEven = floor % 2 === 0;
  return (isEven ? floor : floor + 1) / 100;
}

function format2(x) {
  return round2Bankers(x).toFixed(2);
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

// -------------------------------
// 3) UX – editable полета (без e4, защото e4 има специална логика)
// -------------------------------
function applyUxToEditableInputs() {
  const editableInputs = document.querySelectorAll(
    'input[type="text"]:not([disabled]):not(#return-eur)'
  );

  editableInputs.forEach((input) => {
    input.addEventListener("blur", () => {
      const raw = input.value.trim();

      // празно -> остава празно
      if (raw === "") {
        updateAll();
        return;
      }

      // иначе -> форматираме
      input.value = format2(parseMoney(raw));
      updateAll();
    });
  });
}

// -------------------------------
// 4) Етап 1 – цена
// -------------------------------
function calculatePrice() {
  const e1 = parseMoney(priceEur.value);
  priceBgn.value = format2(e1 * RATE);
}

// -------------------------------
// 5) Етап 2 – препоръки за доплащане
// -------------------------------
function calculatePayRecommendations() {
  const e1 = parseMoney(priceEur.value);
  const e2 = parseMoney(paidEur.value);
  const b2 = parseMoney(paidBgn.value);

  const totalPaidEur = e2 + b2 / RATE;

  if (e1 > 0 && totalPaidEur <= e1 + EPS) {
    const remEur = e1 - totalPaidEur;
    const remBgn = remEur * RATE;

    paidEurHint.textContent = `${t("remaining_prefix")}: ${format2(remEur)} €`;
    paidBgnHint.textContent = `${t("remaining_prefix")}: ${format2(remBgn)} лв`;
  } else {
    paidEurHint.textContent = "";
    paidBgnHint.textContent = "";
  }
}

// -------------------------------
// 6) Етап 3 – ресто
// -------------------------------
function calculateChangeAndReturns() {
  const e1 = parseMoney(priceEur.value);
  const e2 = parseMoney(paidEur.value);
  const b2 = parseMoney(paidBgn.value);

  const totalPaidEur = e2 + b2 / RATE;
  const changeEur = totalPaidEur - e1;

  const isEditingE4 = (document.activeElement === returnEur);

  // Няма ресто / няма цена
  if (!(e1 > 0) || changeEur <= EPS) {
    returnEurHint.textContent = "";
    returnBgnHint.textContent = "";
    returnBgn.value = "0.00";

    if (!isEditingE4) {
      returnEur.value = "";
      manualReturnMode = false;
    }
    return;
  }

  // Има ресто -> показваме хинтовете
  const changeBgn = changeEur * RATE;
  returnEurHint.textContent = `${t("change_prefix")}: ${format2(changeEur)} €`;
  returnBgnHint.textContent = `${t("change_prefix")}: ${format2(changeBgn)} лв`;

  // По подразбиране: всичко в евро (e4 авто), b4 = 0.00
  if (!manualReturnMode) {
    if (!isEditingE4) {
      returnEur.value = format2(changeEur);
    }
    returnBgn.value = "0.00";
    return;
  }

  // Manual режим: b4 индикативно според e4
  const e4raw = returnEur.value.trim();
  const e4 = (e4raw === "") ? 0 : parseMoney(e4raw);
  const e4clamped = clamp(e4, 0, changeEur);

  // Докато пише – не презаписваме e4
  if (!isEditingE4 && e4raw !== "") {
    returnEur.value = format2(e4clamped);
  }

  returnBgn.value = format2((changeEur - e4clamped) * RATE);
}

// -------------------------------
// 7) Общо обновяване
// -------------------------------
function updateAll() {
  calculatePrice();
  calculatePayRecommendations();
  calculateChangeAndReturns();
}

// -------------------------------
// 8) Нулиране
// -------------------------------
function resetAll() {
  manualReturnMode = false;

  priceEur.value = "";
  paidEur.value = "";
  paidBgn.value = "";
  returnEur.value = "";

  priceBgn.value = "0.00";
  returnBgn.value = "0.00";

  paidEurHint.textContent = "";
  paidBgnHint.textContent = "";
  returnEurHint.textContent = "";
  returnBgnHint.textContent = "";

  updateAll();
}

// -------------------------------
// 9) Event listeners
// -------------------------------
priceEur.addEventListener("input", updateAll);
paidEur.addEventListener("input", updateAll);
paidBgn.addEventListener("input", updateAll);

// e4: при писане обновяваме b4 индикативно (ако сме в manual режим)
returnEur.addEventListener("input", updateAll);

// e4: manual режим при фокус
returnEur.addEventListener("focus", () => {
  manualReturnMode = true;
  returnEur.value = "";
  updateAll();
});

// e4: при blur -> ако е празно, връщаме към препоръчания режим; иначе форматираме
returnEur.addEventListener("blur", () => {
  const raw = returnEur.value.trim();

  if (raw === "") {
    manualReturnMode = false;
    updateAll();
    return;
  }

  returnEur.value = format2(parseMoney(raw));
  updateAll();
});

if (resetBtn) {
  resetBtn.addEventListener("click", resetAll);
}

if (langBgBtn) {
  langBgBtn.addEventListener("click", () => setLanguage("bg"));
}

if (langEnBtn) {
  langEnBtn.addEventListener("click", () => setLanguage("en"));
}

// -------------------------------
// 10) Init
// -------------------------------
function init() {
  applyLanguageToStaticText(); // първо превеждаме статичните текстове
  resetAll();
  applyUxToEditableInputs();
}

init();
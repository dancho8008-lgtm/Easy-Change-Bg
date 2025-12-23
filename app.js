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
    btn_donate: "Подкрепи",
    remaining_prefix: "Остава",
    change_prefix: "Ресто",
res_title: "Ресурси",
res_subtitle: "Сподели приложението и виж инструкции.",
res_qr_hint: "Сканирай или натисни QR кода",
res_share_btn: "Сподели приложението",
res_instructions_btn: "Инструкции (снимка)",
res_video_label: "Видео",
btn_back: "← Обратно",
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
    btn_donate: "Support",
    remaining_prefix: "To Pay",
    change_prefix: "Change",
res_title: "Resources",
res_subtitle: "Share the app and view quick instructions.",
res_qr_hint: "Scan or tap the QR code",
res_share_btn: "Share the app",
res_instructions_btn: "Instructions (image)",
res_video_label: "Video",
btn_back: "← Back",
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
   if (typeof updateAll === "function" && priceEur) updateAll(); // безопасно, ако го няма
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

  if (!s) return 0;

  // разделяме цялата и дробната част
  const parts = s.split(".");
  const whole = parts[0] || "0";
  const frac = (parts[1] || "").slice(0, 2); // максимум 2 знака

  const euros = parseInt(whole, 10) || 0;
  const cents = parseInt((frac + "00").slice(0, 2), 10) || 0;

  return euros + cents / 100;
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
// 9) Event listeners (SAFE за multiple pages)
// -------------------------------
priceEur && priceEur.addEventListener("input", updateAll);
paidEur && paidEur.addEventListener("input", updateAll);
paidBgn && paidBgn.addEventListener("input", updateAll);

// e4
if (returnEur) {
  returnEur.addEventListener("input", updateAll);

  returnEur.addEventListener("focus", () => {
    manualReturnMode = true;
    returnEur.value = "";
    updateAll();
  });

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
}

resetBtn && resetBtn.addEventListener("click", resetAll);
langBgBtn && langBgBtn.addEventListener("click", () => setLanguage("bg"));
langEnBtn && langEnBtn.addEventListener("click", () => setLanguage("en"));

// -------------------------------
// 10) Init
// -------------------------------
function init() {
  applyLanguageToStaticText(); // първо превеждаме статичните текстове
 if (priceEur) {
  resetAll();
  applyUxToEditableInputs();
}
}

init();

document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.tagName !== "INPUT") return;

  let v = el.value;

  // маха всичко, което не е цифра, точка или запетая
  v = v.replace(/[^\d.,]/g, "");

  // уеднаквява разделителя
  v = v.replace(".", ",");

  // само една запетая
  const parts = v.split(",");
  if (parts.length > 2) {
    v = parts[0] + "," + parts.slice(1).join("");
  }

  // максимум 2 знака след запетаята
  if (parts.length === 2) {
    parts[1] = parts[1].slice(0, 2);
    v = parts[0] + "," + parts[1];
  }

  el.value = v;
});
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("lang-bg")?.addEventListener("click", () => setLanguage("bg"));
  document.getElementById("lang-en")?.addEventListener("click", () => setLanguage("en"));

  applyLanguageToStaticText();
});

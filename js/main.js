import { loadData, saveData, loadTheme, saveTheme, wipeData, exportBackup, importBackup } from "./storage.js";
import { renderHeaderCount, renderMonthLabel, buildCalendarCard, renderSummary } from "./render.js";
import { todayISO, formatFullDate, compareISO } from "./dateUtils.js";

const ACCENTS = [
  "#ff5f6d,#ffc371",
  "#2196f3,#6dd5fa",
  "#c471f5,#fa71cd",
  "#38ef7d,#11998e",
  "#f7797d,#FBD786",
  "#7f7fd5,#86a8e7",
];

const el = (id) => document.getElementById(id);

const dom = {
  channelCount: el("channelCount"),
  prevMonthBtn: el("prevMonthBtn"),
  nextMonthBtn: el("nextMonthBtn"),
  monthLabel: el("monthLabel"),
  todayBtn: el("todayBtn"),
  demoToggleBtn: el("demoToggleBtn"),
  themeToggleBtn: el("themeToggleBtn"),
  addChannelBtn: el("addChannelBtn"),
  emptyAddBtn: el("emptyAddBtn"),
  menuBtn: el("menuBtn"),
  menuDropdown: el("menuDropdown"),
  exportBtn: el("exportBtn"),
  importBtn: el("importBtn"),
  wipeBtn: el("wipeBtn"),
  importFileInput: el("importFileInput"),

  summaryBar: el("summaryBar"),
  progressFg: el("progressRing"),
  progressText: el("progressRingText"),
  summaryTitle: el("summaryTitle"),
  summaryDate: el("summaryDate"),
  summaryChips: el("summaryChips"),

  emptyState: el("emptyState"),
  channelsGrid: el("channelsGrid"),
  legend: el("legend"),

  channelModalOverlay: el("channelModalOverlay"),
  channelModalTitle: el("channelModalTitle"),
  avatarPreview: el("avatarPreview"),
  avatarInput: el("avatarInput"),
  removeAvatarBtn: el("removeAvatarBtn"),
  accentRow: el("accentRow"),
  channelNameInput: el("channelNameInput"),
  channelStartInput: el("channelStartInput"),
  channelCancelBtn: el("channelCancelBtn"),
  channelSaveBtn: el("channelSaveBtn"),

  dayPopover: el("dayPopover"),
  popoverDate: el("popoverDate"),
  popoverChannel: el("popoverChannel"),
  popoverDoneBtn: el("popoverDoneBtn"),
  popoverDoneLabel: el("popoverDoneLabel"),
  popoverMissedBtn: el("popoverMissedBtn"),
  popoverMissedLabel: el("popoverMissedLabel"),
  popoverOffBtn: el("popoverOffBtn"),
  popoverClearBtn: el("popoverClearBtn"),
};

const now = new Date();
const state = {
  data: loadData(),
  viewYear: now.getFullYear(),
  viewMonth: now.getMonth(),
  demoMode: false,
  modalEditingId: null,
  modalAvatar: "",
  modalAccent: ACCENTS[0],
  popover: null, // { channelId, date }
};

function persist() {
  saveData(state.data);
}

function genId() {
  return `ch_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Rendering ----------

function renderAll() {
  renderHeaderCount(dom.channelCount, state.data.channels.length);
  renderMonthLabel(dom.monthLabel, state.viewYear, state.viewMonth);

  const hasChannels = state.data.channels.length > 0;
  dom.emptyState.classList.toggle("hidden", hasChannels);
  dom.channelsGrid.classList.toggle("hidden", !hasChannels);
  dom.legend.classList.toggle("hidden", !hasChannels);

  dom.channelsGrid.innerHTML = "";
  for (const channel of state.data.channels) {
    const card = buildCalendarCard(channel, {
      data: state.data,
      viewYear: state.viewYear,
      viewMonth: state.viewMonth,
      onDayClick: openDayPopover,
      onEdit: openEditModal,
      onDelete: deleteChannel,
    });
    dom.channelsGrid.appendChild(card);
  }

  renderSummary(
    {
      summaryBar: dom.summaryBar,
      progressFg: dom.progressFg,
      progressText: dom.progressText,
      summaryTitle: dom.summaryTitle,
      summaryDate: dom.summaryDate,
      summaryChips: dom.summaryChips,
      onChipClick: (channelId, targetEl) => openDayPopover(channelId, todayISO(), targetEl),
    },
    state.data
  );

  document.body.classList.toggle("demo-mode", state.demoMode);
}

// ---------- Month navigation ----------

function shiftMonth(delta) {
  let m = state.viewMonth + delta;
  let y = state.viewYear;
  if (m < 0) { m = 11; y -= 1; }
  if (m > 11) { m = 0; y += 1; }
  state.viewMonth = m;
  state.viewYear = y;
  closePopover();
  renderAll();
}

dom.prevMonthBtn.addEventListener("click", () => shiftMonth(-1));
dom.nextMonthBtn.addEventListener("click", () => shiftMonth(1));
dom.todayBtn.addEventListener("click", () => {
  const t = new Date();
  state.viewYear = t.getFullYear();
  state.viewMonth = t.getMonth();
  closePopover();
  renderAll();
});

// ---------- Theme & demo mode ----------

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  saveTheme(theme);
}

applyTheme(loadTheme());

dom.themeToggleBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
});

dom.demoToggleBtn.addEventListener("click", () => {
  state.demoMode = !state.demoMode;
  document.body.classList.toggle("demo-mode", state.demoMode);
});

// ---------- Menu ----------

dom.menuBtn.addEventListener("click", (evt) => {
  evt.stopPropagation();
  dom.menuDropdown.classList.toggle("hidden");
});

document.addEventListener("click", () => {
  dom.menuDropdown.classList.add("hidden");
  closePopover();
});

dom.exportBtn.addEventListener("click", () => {
  exportBackup(state.data);
  dom.menuDropdown.classList.add("hidden");
});

dom.importBtn.addEventListener("click", () => {
  dom.importFileInput.click();
  dom.menuDropdown.classList.add("hidden");
});

dom.importFileInput.addEventListener("change", async () => {
  const file = dom.importFileInput.files?.[0];
  dom.importFileInput.value = "";
  if (!file) return;
  try {
    const imported = await importBackup(file);
    state.data = imported;
    persist();
    renderAll();
  } catch (e) {
    alert("Не удалось прочитать файл резервной копии. Проверьте, что это тот самый JSON-файл.");
  }
});

dom.wipeBtn.addEventListener("click", () => {
  dom.menuDropdown.classList.add("hidden");
  if (!confirm("Удалить все данные без возможности восстановления?")) return;
  wipeData();
  state.data = { channels: [], marks: {} };
  renderAll();
});

// ---------- Channel modal ----------

function resetModalFields() {
  state.modalAvatar = "";
  state.modalAccent = ACCENTS[0];
  dom.channelNameInput.value = "";
  dom.channelStartInput.value = todayISO();
  dom.avatarInput.value = "";
  renderModalAvatar();
  renderAccentRow();
}

function renderModalAvatar() {
  if (state.modalAvatar) {
    dom.avatarPreview.style.backgroundImage = `url(${state.modalAvatar})`;
    dom.avatarPreview.style.background = `url(${state.modalAvatar}) center/cover`;
    dom.avatarPreview.textContent = "";
  } else {
    const [from, to] = state.modalAccent.split(",");
    dom.avatarPreview.style.background = `linear-gradient(135deg, ${from}, ${to})`;
    dom.avatarPreview.textContent = (dom.channelNameInput.value.trim().charAt(0) || "?").toUpperCase();
  }
}

function renderAccentRow() {
  dom.accentRow.innerHTML = "";
  for (const accent of ACCENTS) {
    const [from, to] = accent.split(",");
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "accent-swatch";
    if (accent === state.modalAccent) swatch.classList.add("is-selected");
    swatch.style.background = `linear-gradient(135deg, ${from}, ${to})`;
    swatch.addEventListener("click", () => {
      state.modalAccent = accent;
      state.modalAvatar = "";
      dom.avatarInput.value = "";
      renderModalAvatar();
      renderAccentRow();
    });
    dom.accentRow.appendChild(swatch);
  }
}

function openAddModal() {
  state.modalEditingId = null;
  dom.channelModalTitle.textContent = "Новый канал";
  dom.channelSaveBtn.textContent = "Добавить";
  resetModalFields();
  dom.channelModalOverlay.classList.remove("hidden");
  dom.channelNameInput.focus();
}

function openEditModal(channelId) {
  const channel = state.data.channels.find((c) => c.id === channelId);
  if (!channel) return;
  state.modalEditingId = channelId;
  dom.channelModalTitle.textContent = "Настройки канала";
  dom.channelSaveBtn.textContent = "Сохранить";
  state.modalAvatar = channel.avatar || "";
  state.modalAccent = channel.accent || ACCENTS[0];
  dom.channelNameInput.value = channel.name;
  dom.channelStartInput.value = channel.start;
  renderModalAvatar();
  renderAccentRow();
  dom.channelModalOverlay.classList.remove("hidden");
}

function closeModal() {
  dom.channelModalOverlay.classList.add("hidden");
}

dom.addChannelBtn.addEventListener("click", openAddModal);
dom.emptyAddBtn.addEventListener("click", openAddModal);
dom.channelCancelBtn.addEventListener("click", closeModal);
dom.channelModalOverlay.addEventListener("click", (evt) => {
  if (evt.target === dom.channelModalOverlay) closeModal();
});

dom.avatarPreview.addEventListener("click", () => dom.avatarInput.click());
dom.channelNameInput.addEventListener("input", () => {
  if (!state.modalAvatar) renderModalAvatar();
});

dom.avatarInput.addEventListener("change", async () => {
  const file = dom.avatarInput.files?.[0];
  if (!file) return;
  try {
    state.modalAvatar = await fileToSquareDataUrl(file, 160);
    renderModalAvatar();
  } catch (e) {
    alert("Не удалось загрузить изображение.");
  }
});

dom.removeAvatarBtn.addEventListener("click", () => {
  state.modalAvatar = "";
  dom.avatarInput.value = "";
  renderModalAvatar();
});

dom.channelSaveBtn.addEventListener("click", () => {
  const name = dom.channelNameInput.value.trim();
  const start = dom.channelStartInput.value || todayISO();
  if (!name) {
    dom.channelNameInput.focus();
    return;
  }

  if (state.modalEditingId) {
    const channel = state.data.channels.find((c) => c.id === state.modalEditingId);
    channel.name = name;
    channel.start = start;
    channel.avatar = state.modalAvatar;
    channel.accent = state.modalAccent;
  } else {
    state.data.channels.push({
      id: genId(),
      name,
      start,
      avatar: state.modalAvatar,
      accent: state.modalAccent,
    });
  }

  persist();
  closeModal();
  renderAll();
});

function deleteChannel(channelId) {
  const channel = state.data.channels.find((c) => c.id === channelId);
  if (!channel) return;
  if (!confirm(`Удалить канал «${channel.name}» вместе со всей историей выкладок?`)) return;
  state.data.channels = state.data.channels.filter((c) => c.id !== channelId);
  delete state.data.marks[channelId];
  persist();
  renderAll();
}

function fileToSquareDataUrl(file, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = String(reader.result); };
    reader.onerror = () => reject(reader.error);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
    reader.readAsDataURL(file);
  });
}

// ---------- Day popover ----------

function dayStatus(channelId, date) {
  return (state.data.marks[channelId] || {})[date];
}

function setDayStatus(channelId, date, status) {
  if (!state.data.marks[channelId]) state.data.marks[channelId] = {};
  const current = state.data.marks[channelId][date];
  if (status === null) {
    delete state.data.marks[channelId][date];
  } else if (current === status) {
    delete state.data.marks[channelId][date];
  } else {
    state.data.marks[channelId][date] = status;
  }
  persist();
  renderAll();
}

function openDayPopover(channelId, date, targetEl) {
  const channel = state.data.channels.find((c) => c.id === channelId);
  if (!channel) return;
  if (compareISO(date, channel.start) < 0) return;

  state.popover = { channelId, date };

  const isFuture = compareISO(date, todayISO()) > 0;
  dom.popoverDoneLabel.textContent = isFuture ? "Готово, в отложке" : "Выложил";
  dom.popoverMissedLabel.textContent = isFuture ? "Запланировано" : "Не выложил";
  const missedStatusValue = isFuture ? "planned" : "missed";

  const current = dayStatus(channelId, date);
  dom.popoverDoneBtn.classList.toggle("is-active", current === "done");
  dom.popoverMissedBtn.classList.toggle("is-active", current === missedStatusValue);

  dom.popoverDate.textContent = formatFullDate(date);
  dom.popoverChannel.textContent = channel.name;

  dom.popoverDoneBtn.onclick = (evt) => {
    evt.stopPropagation();
    setDayStatus(channelId, date, "done");
    closePopover();
  };
  dom.popoverMissedBtn.onclick = (evt) => {
    evt.stopPropagation();
    setDayStatus(channelId, date, missedStatusValue);
    closePopover();
  };
  dom.popoverOffBtn.onclick = (evt) => {
    evt.stopPropagation();
    setDayStatus(channelId, date, "off");
    closePopover();
  };
  dom.popoverClearBtn.onclick = (evt) => {
    evt.stopPropagation();
    setDayStatus(channelId, date, null);
    closePopover();
  };

  positionPopover(targetEl);
  dom.dayPopover.classList.remove("hidden");
  dom.dayPopover.addEventListener("click", (e) => e.stopPropagation(), { once: true });
}

function positionPopover(targetEl) {
  const rect = targetEl.getBoundingClientRect();
  const popW = 220;
  let left = rect.left + window.scrollX + rect.width / 2 - popW / 2;
  left = Math.max(12, Math.min(left, window.scrollX + document.documentElement.clientWidth - popW - 12));
  const top = rect.bottom + window.scrollY + 8;
  dom.dayPopover.style.left = `${left}px`;
  dom.dayPopover.style.top = `${top}px`;
}

function closePopover() {
  state.popover = null;
  dom.dayPopover.classList.add("hidden");
}

// ---------- Init ----------

renderAll();

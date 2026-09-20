import {
  WEEKDAY_LABELS,
  daysInMonth,
  mondayFirstWeekday,
  toISODate,
  todayISO,
  formatMonthYear,
  formatDateWithYear,
  compareISO,
  MONTH_NAMES_GENITIVE,
} from "./dateUtils.js";
import { computeStreak, computeMonthStats, computeAllTimeStats } from "./stats.js";
import { noteStatusLabel, notesForChannel, ALL_CHANNELS } from "./notes.js";

function initials(name) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

export function avatarStyle(channel) {
  if (channel.avatar) {
    return { backgroundImage: `url(${channel.avatar})`, background: "" };
  }
  const [from, to] = (channel.accent || "#ff5f6d,#ffc371").split(",");
  return { backgroundImage: "", background: `linear-gradient(135deg, ${from}, ${to})` };
}

function applyAvatarStyle(el, channel) {
  const style = avatarStyle(channel);
  el.style.backgroundImage = style.backgroundImage;
  el.style.background = style.backgroundImage ? style.backgroundImage : style.background;
}

export function renderHeaderCount(el, count) {
  if (count === 0) {
    el.textContent = "каналов пока нет";
    return;
  }
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = "каналов";
  if (mod10 === 1 && mod100 !== 11) word = "канал";
  else if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) word = "канала";
  el.textContent = `${count} ${word}`;
}

export function renderMonthLabel(el, year, monthIndex) {
  el.textContent = formatMonthYear(year, monthIndex);
}

export function buildCalendarCard(channel, ctx) {
  const { data, viewYear, viewMonth, onDayClick, onEdit, onDelete } = ctx;
  const marks = data.marks[channel.id] || {};
  const today = todayISO();

  const card = document.createElement("div");
  card.className = "channel-card";
  card.dataset.channelId = channel.id;

  // Head
  const head = document.createElement("div");
  head.className = "channel-head";

  const avatar = document.createElement("div");
  avatar.className = "channel-avatar";
  applyAvatarStyle(avatar, channel);
  if (!channel.avatar) avatar.textContent = initials(channel.name);

  const meta = document.createElement("div");
  meta.className = "channel-meta";
  const nameEl = document.createElement("div");
  nameEl.className = "channel-name";
  nameEl.textContent = channel.name;
  const streakEl = document.createElement("div");
  streakEl.className = "channel-streak";
  const streak = computeStreak(channel, marks);
  streakEl.innerHTML = streak > 0
    ? `<span class="flame">&#9679;</span> Серия: ${streak} ${streak === 1 ? "день" : streak < 5 ? "дня" : "дней"}`
    : "Серии пока нет";
  meta.append(nameEl, streakEl);

  const actions = document.createElement("div");
  actions.className = "channel-actions";
  const editBtn = document.createElement("button");
  editBtn.className = "icon-btn";
  editBtn.title = "Редактировать канал";
  editBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
  editBtn.addEventListener("click", () => onEdit(channel.id));
  const delBtn = document.createElement("button");
  delBtn.className = "icon-btn";
  delBtn.title = "Удалить канал";
  delBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
  delBtn.addEventListener("click", () => onDelete(channel.id));
  actions.append(editBtn, delBtn);

  head.append(avatar, meta, actions);

  // Weekday row
  const weekdays = document.createElement("div");
  weekdays.className = "calendar-weekdays";
  for (const label of WEEKDAY_LABELS) {
    const span = document.createElement("span");
    span.textContent = label;
    weekdays.appendChild(span);
  }

  // Grid
  const grid = document.createElement("div");
  grid.className = "calendar-grid";

  const total = daysInMonth(viewYear, viewMonth);
  const firstDay = new Date(viewYear, viewMonth, 1);
  const leading = mondayFirstWeekday(firstDay);

  for (let i = 0; i < leading; i++) {
    const empty = document.createElement("div");
    empty.className = "day-cell is-empty";
    grid.appendChild(empty);
  }

  for (let day = 1; day <= total; day++) {
    const date = new Date(viewYear, viewMonth, day);
    const iso = toISODate(date);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day-cell";
    cell.textContent = String(day);

    const disabled = compareISO(iso, channel.start) < 0;
    if (disabled) {
      cell.classList.add("is-disabled");
      cell.disabled = true;
    } else {
      const status = marks[iso];
      if (status) cell.classList.add(`status-${status}`);
      if (iso === today) cell.classList.add("is-today");
      cell.addEventListener("click", (evt) => {
        evt.stopPropagation();
        onDayClick(channel.id, iso, evt.currentTarget);
      });
    }

    grid.appendChild(cell);
  }

  // Footer stats
  const { done, missed } = computeMonthStats(marks, viewYear, viewMonth);
  const footer = document.createElement("div");
  footer.className = "channel-footer";
  const doneEl = document.createElement("span");
  doneEl.className = "stat-done";
  doneEl.textContent = `${done} выложено`;
  const missedEl = document.createElement("span");
  missedEl.className = "stat-missed";
  missedEl.textContent = `${missed} пропусков`;
  const bar = document.createElement("div");
  bar.className = "footer-bar";
  const fill = document.createElement("div");
  fill.className = "footer-bar-fill";
  const denom = done + missed;
  fill.style.width = denom > 0 ? `${Math.round((done / denom) * 100)}%` : "0%";
  bar.appendChild(fill);
  footer.append(doneEl, missedEl, bar);

  card.append(head, weekdays, grid, footer);
  return card;
}

export function renderSummary(elements, data) {
  const { summaryBar, progressFg, progressText, summaryTitle, summaryDate, summaryChips } = elements;
  const today = todayISO();
  const tracked = data.channels.filter((c) => compareISO(c.start, today) <= 0);

  if (tracked.length === 0) {
    summaryBar.classList.add("hidden");
    return;
  }
  summaryBar.classList.remove("hidden");

  const settled = tracked.filter((c) => {
    const status = (data.marks[c.id] || {})[today];
    return status === "done" || status === "missed" || status === "off";
  });
  const pending = tracked.filter((c) => !settled.includes(c));

  const ratio = tracked.length > 0 ? settled.length / tracked.length : 0;
  const circumference = 119.4;
  progressFg.style.strokeDashoffset = String(circumference * (1 - ratio));
  progressText.textContent = `${settled.length}/${tracked.length}`;

  if (pending.length === 0) {
    summaryTitle.textContent = "День закрыт";
  } else {
    summaryTitle.textContent = `Сегодня осталось: ${pending.length}`;
  }
  const d = new Date(`${today}T00:00:00`);
  const weekdays = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  summaryDate.textContent = `${d.getDate()} ${MONTH_NAMES_GENITIVE[d.getMonth()]}, ${weekdays[d.getDay()]}`;

  summaryChips.innerHTML = "";
  for (const channel of tracked) {
    const chip = document.createElement("button");
    chip.className = "summary-chip";
    if (!pending.some((c) => c.id === channel.id)) chip.classList.add("is-done");

    const av = document.createElement("span");
    av.className = "chip-avatar";
    applyAvatarStyle(av, channel);
    if (!channel.avatar) av.textContent = initials(channel.name);

    const label = document.createElement("span");
    label.className = "chip-name";
    label.textContent = channel.name;

    chip.append(av, label);
    chip.addEventListener("click", (evt) => {
      evt.stopPropagation();
      elements.onChipClick(channel.id, evt.currentTarget);
    });
    summaryChips.appendChild(chip);
  }
}

function findChannel(channels, id) {
  return channels.find((c) => c.id === id);
}

function buildNoteRow(note, channels, ctx) {
  const { onStatusClick, onEdit, onDelete, onRestore, onDeleteForever, trashMode } = ctx;
  const channel = findChannel(channels, note.channelId);

  const row = document.createElement("div");
  row.className = "notes-row";

  const channelCell = document.createElement("div");
  channelCell.className = "note-channel";
  if (note.channelId === ALL_CHANNELS) {
    const av = document.createElement("span");
    av.className = "chip-avatar chip-avatar-all";
    av.textContent = "∀";
    const nameEl = document.createElement("span");
    nameEl.className = "note-channel-name";
    nameEl.textContent = "Для всех";
    channelCell.append(av, nameEl);
  } else if (channel) {
    const av = document.createElement("span");
    av.className = "chip-avatar";
    applyAvatarStyle(av, channel);
    if (!channel.avatar) av.textContent = initials(channel.name);
    const nameEl = document.createElement("span");
    nameEl.className = "note-channel-name";
    nameEl.textContent = channel.name;
    channelCell.append(av, nameEl);
  } else {
    channelCell.textContent = "Канал удалён";
  }

  const statusBtn = document.createElement("button");
  statusBtn.type = "button";
  statusBtn.className = `status-pill status-${note.status}`;
  statusBtn.textContent = noteStatusLabel(note.status);
  if (!trashMode) {
    statusBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      onStatusClick(note.id, evt.currentTarget);
    });
  } else {
    statusBtn.disabled = true;
    statusBtn.style.cursor = "default";
  }

  const commentEl = document.createElement("div");
  commentEl.className = "note-comment";
  commentEl.textContent = note.comment || "—";

  const dateEl = document.createElement("div");
  dateEl.className = "note-date";
  dateEl.textContent = formatDateWithYear(note.date);

  const actions = document.createElement("div");
  actions.className = "note-actions";

  if (!trashMode) {
    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.title = "Редактировать заметку";
    editBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
    editBtn.addEventListener("click", () => onEdit(note.id));
    const delBtn = document.createElement("button");
    delBtn.className = "icon-btn";
    delBtn.title = "Удалить заметку";
    delBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
    delBtn.addEventListener("click", () => onDelete(note.id));
    actions.append(editBtn, delBtn);
  } else {
    const restoreBtn = document.createElement("button");
    restoreBtn.className = "icon-btn";
    restoreBtn.title = "Восстановить заметку";
    restoreBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>`;
    restoreBtn.addEventListener("click", () => onRestore(note.id));
    const forgetBtn = document.createElement("button");
    forgetBtn.className = "icon-btn";
    forgetBtn.title = "Удалить навсегда";
    forgetBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
    forgetBtn.addEventListener("click", () => onDeleteForever(note.id));
    actions.append(restoreBtn, forgetBtn);
  }

  row.append(channelCell, statusBtn, commentEl, dateEl, actions);
  return row;
}

export function renderNotesTable(container, notes, channels, ctx) {
  container.innerHTML = "";
  const sorted = [...notes].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const note of sorted) {
    container.appendChild(buildNoteRow(note, channels, { ...ctx, trashMode: false }));
  }
}

export function renderDeletedTable(container, notes, channels, ctx) {
  container.innerHTML = "";
  const sorted = [...notes].sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""));
  for (const note of sorted) {
    container.appendChild(buildNoteRow(note, channels, { ...ctx, trashMode: true }));
  }
}

export function renderMetricsTable(container, channels, data) {
  container.innerHTML = "";
  for (const channel of channels) {
    const marks = data.marks[channel.id] || {};
    const { done, missed } = computeAllTimeStats(marks);
    const rate = done + missed > 0 ? Math.round((done / (done + missed)) * 100) : 0;
    const channelNotes = notesForChannel(data.notes, channel.id);
    const notesDone = channelNotes.filter((n) => n.status === "done").length;

    const row = document.createElement("div");
    row.className = "notes-row";

    const channelCell = document.createElement("div");
    channelCell.className = "note-channel";
    const av = document.createElement("span");
    av.className = "chip-avatar";
    applyAvatarStyle(av, channel);
    if (!channel.avatar) av.textContent = initials(channel.name);
    const nameEl = document.createElement("span");
    nameEl.className = "note-channel-name";
    nameEl.textContent = channel.name;
    channelCell.append(av, nameEl);

    const doneEl = document.createElement("div");
    doneEl.className = "metric-value is-done";
    doneEl.textContent = String(done);

    const missedEl = document.createElement("div");
    missedEl.className = "metric-value is-missed";
    missedEl.textContent = String(missed);

    const rateEl = document.createElement("div");
    rateEl.className = "metric-rate";
    rateEl.textContent = `${rate}%`;

    const notesEl = document.createElement("div");
    notesEl.className = "metric-value";
    notesEl.textContent = `${notesDone}/${channelNotes.length}`;

    row.append(channelCell, doneEl, missedEl, rateEl, notesEl);
    container.appendChild(row);
  }
}

export const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export const WEEKDAY_LABELS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Monday = 0 ... Sunday = 6
export function mondayFirstWeekday(date) {
  const day = date.getDay();
  return (day + 6) % 7;
}

export function formatMonthYear(year, monthIndex) {
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

const WEEKDAY_FULL = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

export const MONTH_NAMES_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export function formatFullDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${MONTH_NAMES_GENITIVE[d.getMonth()]}, ${WEEKDAY_FULL[d.getDay()]}`;
}

export function compareISO(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addDaysISO(iso, delta) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

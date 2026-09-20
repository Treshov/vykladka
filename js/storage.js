const DATA_KEY = "vykladka:v1";
const THEME_KEY = "vykladka:theme";

function emptyData() {
  return { channels: [], marks: {}, notes: [] };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw);
    return {
      channels: Array.isArray(parsed.channels) ? parsed.channels : [],
      marks: parsed.marks && typeof parsed.marks === "object" ? parsed.marks : {},
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch (e) {
    console.error("Не удалось прочитать данные из localStorage", e);
    return emptyData();
  }
}

export function saveData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export function wipeData() {
  localStorage.removeItem(DATA_KEY);
}

export function loadTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function exportBackup(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `vykladka-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed.channels) || typeof parsed.marks !== "object") {
          throw new Error("Некорректный формат файла");
        }
        resolve({
          channels: parsed.channels,
          marks: parsed.marks,
          notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
